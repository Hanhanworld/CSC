(() => {
    const viewer = document.querySelector('.map-viewer');
    const image = document.querySelector('.factory-map');
    const missingMessage = document.querySelector('.map-missing');
    const zoomLevel = document.querySelector('.zoom-level');
    const pointers = new Map();
    const minimumScale = 0.05;
    const maximumScale = 8;
    const zoomFactor = 1.2;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let previousPinch = null;

    function render() {
        image.style.width = `${image.naturalWidth}px`;
        image.style.height = `${image.naturalHeight}px`;
        image.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${scale})`;
        zoomLevel.value = `${Math.round(scale * 100)}%`;
        zoomLevel.textContent = `${Math.round(scale * 100)}%`;
    }

    function fitToView() {
        if (!image.naturalWidth || !viewer.clientWidth || !viewer.clientHeight) return;
        scale = Math.min(viewer.clientWidth / image.naturalWidth, viewer.clientHeight / image.naturalHeight);
        offsetX = 0;
        offsetY = 0;
        render();
    }

    function pointInViewer(clientX, clientY) {
        const bounds = viewer.getBoundingClientRect();
        return {
            x: clientX - bounds.left - bounds.width / 2,
            y: clientY - bounds.top - bounds.height / 2
        };
    }

    function zoomAt(point, factor) {
        const nextScale = Math.max(minimumScale, Math.min(maximumScale, scale * factor));
        const appliedFactor = nextScale / scale;
        offsetX = point.x - (point.x - offsetX) * appliedFactor;
        offsetY = point.y - (point.y - offsetY) * appliedFactor;
        scale = nextScale;
        render();
    }

    function getPinchState() {
        const [first, second] = pointers.values();
        const center = pointInViewer((first.x + second.x) / 2, (first.y + second.y) / 2);
        return {
            center,
            distance: Math.hypot(second.x - first.x, second.y - first.y)
        };
    }

    image.addEventListener('load', () => {
        missingMessage.hidden = true;
        image.style.visibility = 'visible';
        fitToView();
    });

    image.addEventListener('error', () => {
        image.hidden = true;
        missingMessage.hidden = false;
    });

    if (image.complete) {
        if (image.naturalWidth) {
            image.style.visibility = 'visible';
            fitToView();
        } else {
            image.hidden = true;
            missingMessage.hidden = false;
        }
    }

    viewer.addEventListener('wheel', (event) => {
        event.preventDefault();
        zoomAt(pointInViewer(event.clientX, event.clientY), event.deltaY < 0 ? zoomFactor : 1 / zoomFactor);
    }, { passive: false });

    viewer.addEventListener('pointerdown', (event) => {
        if (image.hidden) return;
        event.preventDefault();
        viewer.setPointerCapture(event.pointerId);
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        viewer.classList.add('is-dragging');
        previousPinch = pointers.size === 2 ? getPinchState() : null;
    });

    viewer.addEventListener('pointermove', (event) => {
        const previous = pointers.get(event.pointerId);
        if (!previous) return;

        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

        if (pointers.size >= 2 && previousPinch) {
            const nextPinch = getPinchState();
            zoomAt(previousPinch.center, nextPinch.distance / previousPinch.distance);
            offsetX += nextPinch.center.x - previousPinch.center.x;
            offsetY += nextPinch.center.y - previousPinch.center.y;
            previousPinch = nextPinch;
            render();
            return;
        }

        offsetX += event.clientX - previous.x;
        offsetY += event.clientY - previous.y;
        render();
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    });

    function endPointer(event) {
        pointers.delete(event.pointerId);
        previousPinch = pointers.size === 2 ? getPinchState() : null;
        if (pointers.size === 0) viewer.classList.remove('is-dragging');
    }

    viewer.addEventListener('pointerup', endPointer);
    viewer.addEventListener('pointercancel', endPointer);
    viewer.addEventListener('lostpointercapture', endPointer);

    document.querySelector('.map-toolbar').addEventListener('click', (event) => {
        const button = event.target.closest('[data-map-action]');
        if (!button) return;

        const center = { x: 0, y: 0 };
        switch (button.dataset.mapAction) {
            case 'zoom-in':
                zoomAt(center, zoomFactor);
                break;
            case 'zoom-out':
                zoomAt(center, 1 / zoomFactor);
                break;
            case 'fit':
            case 'reset':
                fitToView();
                break;
        }
    });

    viewer.addEventListener('keydown', (event) => {
        const center = { x: 0, y: 0 };
        if (event.key === '+' || event.key === '=') {
            event.preventDefault();
            zoomAt(center, zoomFactor);
        } else if (event.key === '-') {
            event.preventDefault();
            zoomAt(center, 1 / zoomFactor);
        } else if (event.key === '0') {
            event.preventDefault();
            fitToView();
        }
    });

})();