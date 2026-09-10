import { fireEvent, render } from '@solidjs/testing-library';
import { describe, expect, test, vi } from 'vitest';
import ChordTransposeControl from './ChordTransposeControl';

describe('<ChordTransposeControl />', () => {
  test('renders default state, offset, and disabled reset button when value is 0', () => {
    const { getByText, getByTitle } = render(() => (
      <ChordTransposeControl value={0} onChange={vi.fn()} />
    ));

    expect(getByText('Key:')).toBeInTheDocument();
    expect(getByText('0')).toBeInTheDocument();
    const resetBtn = getByTitle('Reset transposition');
    expect(resetBtn).toBeInTheDocument();
    expect(resetBtn).toBeDisabled();
  });

  test('calls onChange when increment and decrement buttons are clicked', () => {
    const handleChange = vi.fn();
    const { getByTitle } = render(() => (
      <ChordTransposeControl value={0} onChange={handleChange} />
    ));

    const incrementBtn = getByTitle('Transpose up 1 semitone');
    const decrementBtn = getByTitle('Transpose down 1 semitone');

    fireEvent.click(incrementBtn);
    expect(handleChange).toHaveBeenCalledWith(1);

    fireEvent.click(decrementBtn);
    expect(handleChange).toHaveBeenCalledWith(-1);
  });

  test('enables reset button when non-zero and resets to 0 on click', () => {
    const handleChange = vi.fn();
    const { getByTitle, getByText } = render(() => (
      <ChordTransposeControl value={2} onChange={handleChange} />
    ));

    expect(getByText('+2')).toBeInTheDocument();
    const resetBtn = getByTitle('Reset transposition');
    expect(resetBtn).toBeInTheDocument();
    expect(resetBtn).not.toBeDisabled();

    fireEvent.click(resetBtn);
    expect(handleChange).toHaveBeenCalledWith(0);
  });
});
