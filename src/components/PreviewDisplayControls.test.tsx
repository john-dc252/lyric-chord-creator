import { fireEvent, render } from '@solidjs/testing-library';
import { describe, expect, test, vi } from 'vitest';
import PreviewDisplayControls from './PreviewDisplayControls';

describe('<PreviewDisplayControls />', () => {
  test('renders zoom presets and fullscreen toggle', () => {
    const handleZoom = vi.fn();
    const handleFullscreen = vi.fn();

    const { getByText, getByTitle } = render(() => (
      <PreviewDisplayControls
        zoom="fit"
        onZoomChange={handleZoom}
        isFullscreen={false}
        onToggleFullscreen={handleFullscreen}
      />
    ));

    expect(getByText('Zoom:')).toBeInTheDocument();
    expect(getByText('Fit')).toBeInTheDocument();
    expect(getByText('75%')).toBeInTheDocument();
    expect(getByText('100%')).toBeInTheDocument();

    const fullscreenBtn = getByTitle('Fullscreen Preview');
    expect(fullscreenBtn).toBeInTheDocument();

    fireEvent.click(getByText('75%'));
    expect(handleZoom).toHaveBeenCalledWith(0.75);

    fireEvent.click(fullscreenBtn);
    expect(handleFullscreen).toHaveBeenCalledTimes(1);
  });

  test('reflects fullscreen exit label when isFullscreen is true', () => {
    const { getByTitle, getByText } = render(() => (
      <PreviewDisplayControls
        zoom={1.0}
        onZoomChange={vi.fn()}
        isFullscreen={true}
        onToggleFullscreen={vi.fn()}
      />
    ));

    expect(getByTitle('Exit Fullscreen (Esc)')).toBeInTheDocument();
    expect(getByText('Exit')).toBeInTheDocument();
  });
});
