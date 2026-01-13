export function resizable(node: HTMLElement) {
    const handle = document.createElement('div');
    handle.classList.add('absolute', 'right-0', 'top-0', 'h-full', 'w-1', 'cursor-col-resize', 'bg-zinc-800', 'hover:bg-emerald-500', 'z-10');
    node.style.position = 'relative';
    node.appendChild(handle);

    let startX = 0;
    let startWidth = 0;
    let isResizing = false;

    function onMouseDown(e: MouseEvent) {
        startX = e.clientX;
        startWidth = node.offsetWidth;
        isResizing = true;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        handle.classList.add('bg-emerald-500', 'w-1.5');
        document.body.style.cursor = 'col-resize';
        e.preventDefault(); // Prevent text selection
    }

    function onMouseMove(e: MouseEvent) {
        const diff = e.clientX - startX;
        const newWidth = Math.max(50, startWidth + diff); // Min width 50px
        node.style.width = `${newWidth}px`;
        node.style.minWidth = `${newWidth}px`; // Force it
        node.style.maxWidth = `${newWidth}px`; // Force it
    }

    function onMouseUp() {
        isResizing = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        handle.classList.remove('bg-emerald-500', 'w-1.5');
        document.body.style.cursor = '';
    }

    handle.addEventListener('mousedown', onMouseDown);

    return {
        destroy() {
            handle.removeEventListener('mousedown', onMouseDown);
            // Clean up document listeners if destroyed mid-resize
            if (isResizing) {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = '';
            }
            handle.remove();
        }
    };
}
