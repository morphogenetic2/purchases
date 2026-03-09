import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { parse } from 'node-html-parser';
import * as crypto from 'crypto';
import * as fs from 'fs';

const PORTAL_BASE = process.env.PORTAL_BASE_URL ?? '';

/**
 * POST /api/portal
 *
 * Body: { username: string, password: string, page?: string }
 *
 * Performs a 2-step login against the procurement portal, then scrapes
 * the /Pending page table, extracting full values from `title` attributes
 * where the visible text is truncated.
 *
 * Returns: { orders: ScrapedOrder[] }
 */
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);

	if (!body?.username || !body?.password) {
		throw error(400, 'username and password are required');
	}

	const { username, password } = body as {
		username: string;
		password: string;
	};
	const page = 'Tracking';

	if (!PORTAL_BASE) {
		throw error(500, 'PORTAL_BASE_URL environment variable is not set');
	}

	// ── Step 1: POST /LogIn.php ──────────────────────────────────────────────
	// The portal first validates credentials via a JSON/form AJAX call.
	// 200 = valid, 401 = invalid.
	const loginResp = await fetch(`${PORTAL_BASE}/LogIn.php`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			'X-Requested-With': 'XMLHttpRequest',
			Referer: `${PORTAL_BASE}/`,
			Origin: PORTAL_BASE,
			'User-Agent':
				'Mozilla/5.0 (compatible; LabFlowBot/1.0)'
		},
		body: new URLSearchParams({ username, password })
	});

	if (!loginResp.ok) {
		throw error(401, 'Invalid credentials (LogIn.php rejected)');
	}

	// ── Step 2: POST /loginpass.php with HTTP Basic Auth (MD5 password) ──────
	// After the AJAX credential check, the portal establishes the session via
	// HTTP Basic Auth on a second endpoint. Node's native fetch() forbids 
	// putting user:pass in the URL string, so we construct the Authorization
	// header manually using the exact same MD5 hash scheme.
	const md5Password = crypto.createHash('md5').update(password).digest('hex');
    const basicAuth = Buffer.from(`${username}:${md5Password}`).toString('base64');

	const sessionResp = await fetch(`${PORTAL_BASE}/loginpass.php`, {
		method: 'POST',
		headers: {
			'Content-Length': '0',
			'X-Requested-With': 'XMLHttpRequest',
			Referer: `${PORTAL_BASE}/`,
			Origin: PORTAL_BASE,
			'User-Agent': 'Mozilla/5.0 (compatible; LabFlowBot/1.0)',
            Authorization: `Basic ${basicAuth}`
		}
	});

	if (!sessionResp.ok) {
		throw error(401, 'Session establishment failed (loginpass.php rejected)');
	}

	// Collect all Set-Cookie headers from both responses to carry the session
	const cookieHeader = [
		...(loginResp.headers.getSetCookie?.() ?? []),
		...(sessionResp.headers.getSetCookie?.() ?? [])
	]
		.map((c) => c.split(';')[0])
		.join('; ');

	// Also try the Authorization header approach (HTTP Basic) as fallback
	// (basicAuth already calculated above)

	// ── Step 3: GET /<page> and scrape the table ──────────────────────────────
	const pageResp = await fetch(`${PORTAL_BASE}/${page}`, {
		method: 'GET',
		headers: {
			Cookie: cookieHeader,
			Authorization: `Basic ${basicAuth}`,
			Referer: PORTAL_BASE,
			'User-Agent': 'Mozilla/5.0 (compatible; LabFlowBot/1.0)',
			Accept: 'text/html,application/xhtml+xml'
		}
	});

	if (!pageResp.ok) {
		throw error(502, `Failed to fetch portal page /${page}: HTTP ${pageResp.status}`);
	}

	const buffer = await pageResp.arrayBuffer();
	const html = new TextDecoder('iso-8859-1').decode(buffer);

	// ── Step 4: Parse the DataTable HTML ──────────────────────────────────────
	const { orders, empty, emptyReason } = parsePortalTable(page, html);

	return json({ orders, count: orders.length, empty, emptyReason });
};

interface ScrapedOrder {
	project_code: string | null;      // Project col
	order_date: string | null;        // Date col (will use today for cart)
	po_number: string | null;         // N/A in cart
	provider: string;                 // Supplier Name col
	sku: string | null;               // Product col
	description: string;              // Description col
	quantity: number;                 // Quantity col
	price: number | null;             // Price col
	ordered_by: string | null;        // N/A in cart, set to username in UI
}

function parsePortalTable(pageUrl: string, html: string): { orders: ScrapedOrder[], empty: boolean, emptyReason: string | null } {
	let datatable: any = null;

	let datatableIdx = html.indexOf('id="datatable"');
	if (datatableIdx === -1) datatableIdx = html.indexOf('id=datatable');

	if (datatableIdx > -1) {
		const startIdx = html.lastIndexOf('<table', datatableIdx);
		const endIdx = html.indexOf('</table>', datatableIdx) + 8;
		const tableHtml = html.substring(startIdx, endIdx);
		datatable = parse(tableHtml).querySelector('table');
	}

	if (datatable) {
		const orders = parseDatatable(datatable, pageUrl);
		return { orders, empty: orders.length === 0, emptyReason: orders.length === 0 ? `No pending orders found in this section.` : null };
	}

	// No recognized table found. Check if the portal says "no results" explicitly.
	const lowerHtml = html.toLowerCase();
	const noResultPhrases = [
		'no results found',
		'no s\'han trobat resultats',
		'no se han encontrado resultados',
		'sin resultados',
		'no hay resultados',
	];
	const foundPhrase = noResultPhrases.find(p => lowerHtml.includes(p));
	if (foundPhrase) {
		return { orders: [], empty: true, emptyReason: 'The portal reports no orders in this section.' };
	}

	// For debugging, write the html to a file to see what we actually got
	try {
		fs.writeFileSync('/home/arodrigo/purchases/debug_portal_response.html', html);
	} catch (e) {
		// ignore
	}

	throw error(
		502,
		'Could not find a recognized table (#datatable). The portal HTML structure may have changed, or the session was not established. (Response saved to debug_portal_response.html)'
	);
}



function parseDatatable(table: any, pageUrl: string): ScrapedOrder[] {
	let rows = table.querySelectorAll('tbody tr');
	if (!rows || rows.length === 0) {
		// Sometimes portal tables drop the tbody tag entirely in certain pages
		rows = table.querySelectorAll('tr');
		if (rows.length > 0 && rows[0].querySelectorAll('th').length > 0) {
			rows = rows.slice(1);
		}
	}
	
	const orders: ScrapedOrder[] = [];

	for (const row of rows) {
		const cells = row.querySelectorAll('td');
		if (cells.length < 12) continue;

		// Helper: get full value preferring `title` attr, fallback to text
		const fullText = (cell: any, preferTitle = true): string => {
			if (!cell) return '';
			const font = cell.querySelector('font');
			if (preferTitle && font?.getAttribute('title')) {
				return font.getAttribute('title')!.trim();
			}
			const colorDiv = cell.querySelector('div.colorcode');
			if (preferTitle && colorDiv?.getAttribute('title')) {
				return colorDiv.getAttribute('title')!.trim();
			}
			return cell.text.trim();
		};

		const project_code = fullText(cells[1], false) || null;
		const rawDate = fullText(cells[2], false);
		const po_number = fullText(cells[5], false) || null; // 5 is Orders(PO)
		const provider = fullText(cells[7]) || 'Unknown';
		const sku = fullText(cells[8]) || null;
		const description = fullText(cells[9]) || '';
		const qtyText = fullText(cells[11], false);
		const quantity = parseInt(qtyText, 10) || 1;
		const ordered_by = fullText(cells[14], false) || null;

		// Skip completely empty rows
		if (!provider && !sku && !description) continue;

		// Normalise date from "DD/MM" (portal shows current year implicitly) to ISO
		let order_date: string | null = null;
		if (rawDate && rawDate.trim().match(/^\d{2}\/\d{2}$/)) {
			const [dd, mm] = rawDate.trim().split('/');
			const year = new Date().getFullYear();
			order_date = `${year}-${mm}-${dd}`;
		} else if (rawDate && rawDate.trim().match(/^\d{2}\/\d{2}\/\d{4}$/)) {
			const [dd, mm, yyyy] = rawDate.trim().split('/');
			order_date = `${yyyy}-${mm}-${dd}`;
		}

		orders.push({
			project_code,
			order_date: order_date || new Date().toISOString().split('T')[0],
			po_number,
			provider,
			sku,
			description,
			quantity,
			price: null, // No price available in this view
			ordered_by
		});
	}

	return orders;
}
