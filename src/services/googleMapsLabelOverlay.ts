/// <reference types="google.maps" />

export type GoogleMapsLabelOverlay = {
  setLabel: (label: string) => void;
  setMap: (map: google.maps.Map | null) => void;
  setPosition: (position: google.maps.LatLngLiteral) => void;
};

export const createGoogleMapsLabelOverlay = (
  OverlayView: typeof google.maps.OverlayView,
  LatLng: typeof google.maps.LatLng,
  options: {
    label: string;
    map: google.maps.Map;
    position: google.maps.LatLngLiteral;
  },
): GoogleMapsLabelOverlay => {
  class LabelOverlay extends OverlayView {
    private readonly element = document.createElement('div');
    private position = options.position;

    constructor() {
      super();
      Object.assign(this.element.style, {
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
        transform: 'translate(-50%, calc(-100% - 12px))',
        whiteSpace: 'nowrap',
      });
      this.element.setAttribute('role', 'img');
      this.setLabel(options.label);
    }

    setLabel(label: string) {
      this.element.replaceChildren();
      this.element.setAttribute('aria-label', label);

      const bubble = document.createElement('div');
      bubble.textContent = label;
      Object.assign(bubble.style, {
        maxWidth: '132px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        boxSizing: 'border-box',
        border: '1px solid #d8e0e8',
        borderRadius: '6px',
        background: '#ffffff',
        color: '#16202a',
        font: '800 11px system-ui, sans-serif',
        padding: '5px 8px',
        boxShadow: '0 4px 10px rgba(15, 23, 42, 0.18)',
      });

      const pointer = document.createElement('div');
      Object.assign(pointer.style, {
        width: '0',
        height: '0',
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderTop: '6px solid #ffffff',
      });

      this.element.append(bubble, pointer);
    }

    setPosition(position: google.maps.LatLngLiteral) {
      this.position = position;
      if (this.element.isConnected) {
        this.draw();
      }
    }

    onAdd() {
      OverlayView.preventMapHitsAndGesturesFrom(this.element);
      this.getPanes()?.floatPane.appendChild(this.element);
    }

    draw() {
      const point = this.getProjection().fromLatLngToDivPixel(
        new LatLng(this.position),
      );
      if (point) {
        this.element.style.left = `${point.x}px`;
        this.element.style.top = `${point.y}px`;
      }
    }

    onRemove() {
      this.element.remove();
    }
  }

  const overlay = new LabelOverlay();
  overlay.setMap(options.map);
  return overlay;
};
