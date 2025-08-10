import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayerBar from '../pages/Player/player';
import { MusicContext } from '../App';

const mockPlayer = {
  togglePlay: jest.fn(),
  nextTrack: jest.fn(),
  previousTrack: jest.fn(),
  seek: jest.fn(),
  setVolume: jest.fn()
};

const mockContext = {
  playerStatus: {
    isPlaying: false,
    currentTrack: {
      name: 'Test Song',
      artists: [{ name: 'Test Artist' }],
      album: { images: [{ url: 'test.jpg' }] },
      duration: 180000
    },
    position: 30000,
    volume: 0.5
  },
  player: mockPlayer
};

describe('PlayerBar', () => {
  it('toggles play/pause when button is clicked', () => {
    render(
      <MusicContext.Provider value={mockContext}>
        <PlayerBar />
      </MusicContext.Provider>
    );

    const playButton = screen.getByTestId('mini-play-btn');
    fireEvent.click(playButton);
    expect(mockPlayer.togglePlay).toHaveBeenCalled();
  });

  it('updates volume when slider changes', () => {
    render(
      <MusicContext.Provider value={mockContext}>
        <PlayerBar />
      </MusicContext.Provider>
    );
  
    // Click the expand button to show full player view
    const expandButton = screen.getByTestId('expand-btn');
    fireEvent.click(expandButton);
  
    // Now find the volume slider in the full player view
    const volumeSlider = screen.getByTestId('volume-slider');
    fireEvent.change(volumeSlider, { target: { value: '0.8' } });
    expect(mockPlayer.setVolume).toHaveBeenCalledWith(0.8);
  });

  it('switches between mini and full player views', () => {
    const { getByTestId } = render(
      <MusicContext.Provider value={mockContext}>
        <PlayerBar />
      </MusicContext.Provider>
    );

    const expandButton = getByTestId('expand-btn');
    fireEvent.click(expandButton);

    // Verify full player elements
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });
});