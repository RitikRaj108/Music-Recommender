import React from 'react';
import { render, screen, fireEvent, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MusicRecommendations from '../pages/Music-player/music-recommendations2';
import '@testing-library/jest-dom/extend-expect';
import { MusicContext } from '../App';

const mockContext = {
  handleTrackLike: jest.fn(),
  handlePlayTrack: jest.fn(),
  likedTracks: new Set(),
};

describe('MusicRecommendations', () => {
  const mockRecommendations = [
    { id: '1', title: 'Chill Track', artist: 'Chill Artist', cover: 'chill.jpg' }
  ];

  beforeEach(() => {
    // Mock localStorage to return a Spotify access token
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'spotify_access_token') {
        return 'dummy-token';
      }
      return null;
    });

    // Mock API responses for all fetch calls
    global.fetch = jest.fn((url) => {
      // Mood recommendations endpoint
      if (url.includes('q=chill')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tracks: { items: mockRecommendations } })
        });
      }
      // Other endpoints
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ items: [{ track: mockRecommendations[0] }] })
      });
    });
  });

  afterEach(() => {
    global.fetch.mockClear();
    Storage.prototype.getItem.mockClear();
  });


  it('limits genre selection to 5', async () => {
    render(
      <MusicContext.Provider value={mockContext}>
        <MemoryRouter>
          <MusicRecommendations />
        </MemoryRouter>
      </MusicContext.Provider>
    );

    await waitForElementToBeRemoved(() =>
      screen.getByText('Discovering perfect music for you...')
    );

    const genreButtons = screen.getAllByRole('button', {
      name: /Pop|Rock|Hip-Hop|R&B|Jazz|Classical|Electronic|Country|Latin|Metal|Alternative|Folk|Blues|Reggae|K-Pop/i
    });
    
    // Attempt to select 6 genres
    for (let i = 0; i < 6; i++) {
      fireEvent.click(genreButtons[i]);
    }

    const selected = genreButtons.filter(btn => btn.classList.contains('selected'));
    expect(selected).toHaveLength(5);
  });
});
