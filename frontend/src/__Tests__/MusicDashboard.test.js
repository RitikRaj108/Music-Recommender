import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import MusicDashboard from '../pages/Music-player/music-dashboard';
import { MusicContext } from '../App';

// Mock API responses at global level
const mockContext = {
  musichubPlaylistId: 'test-playlist-id',
  setMusichubPlaylistId: jest.fn(),
  likedTracks: new Set(),
  setLikedTracks: jest.fn(),
  handleTrackLike: jest.fn(),
  handlePlayTrack: jest.fn(),
  deviceId: 'test-device',
  playerStatus: {},
  player: {},
  userPlaylists: [],
  currentUser: { id: 'user-123' }
};

// Mock external dependencies properly
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

describe('MusicDashboard', () => {
  beforeEach(() => {
    localStorage.setItem('spotify_access_token', 'test-token');
    
    global.fetch = jest.fn()
      .mockResolvedValueOnce({  // Top tracks
        ok: true, 
        json: () => Promise.resolve({ items: [] })
      })
      .mockResolvedValueOnce({  // Trending tracks
        ok: true, 
        json: () => Promise.resolve({ items: [] })
      })
      .mockResolvedValueOnce({  // New releases - FIXED STRUCTURE
        ok: true, 
        json: () => Promise.resolve({ 
          albums: { items: [] } // Correct Spotify API structure
        })
      })
      .mockResolvedValueOnce({  // Spotify create playlist
        ok: true, 
        json: () => Promise.resolve({ id: 'test123' })
      })
      .mockResolvedValueOnce({  // MongoDB save
        ok: true, 
        json: () => Promise.resolve({ _id: '1', name: 'Test Playlist' })
      });
  });

  // ... (afterEach remains the same)

  it('handles search errors', async () => {
    // For this test, mock fetch to reject so that an error is triggered
    global.fetch.mockRejectedValue(new Error('API error'));

    render(
      <MemoryRouter>
        <MusicContext.Provider value={mockContext}>
          <MusicDashboard />
        </MusicContext.Provider>
      </MemoryRouter>
    );

    // Wait for the error container to appear.
    await waitFor(() => {
      expect(screen.getByText('Error Loading Content')).toBeInTheDocument();
    });
  });

  it('shows loading state', async () => {
    // Mock delayed response by returning a never-resolving promise
    global.fetch.mockImplementation(() => new Promise(() => {}));

    render(
      <MemoryRouter>
        <MusicContext.Provider value={mockContext}>
          <MusicDashboard />
        </MusicContext.Provider>
      </MemoryRouter>
    );

    // Instead of searching by text, get the loading container by its test ID
    const loadingContainer = screen.getByTestId('loading-spinner');
    expect(loadingContainer).toBeInTheDocument();
    expect(loadingContainer).toHaveTextContent(/Loading music data/i);
  });
});
