import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LikedSongs from '../pages/Music-player/likedSongs';
import '@testing-library/jest-dom/extend-expect';
import { MusicContext } from '../App';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock Spotify API response
const mockTracks = {
  items: [
    {
      track: {
        id: '1',
        name: 'Test Track 1',
        duration_ms: 180000,
        artists: [{ name: 'Artist 1' }],
        album: { images: [{ url: 'http://test.com/cover1.jpg' }] },
        uri: 'spotify:track:1',
        added_at: '2023-01-01T00:00:00Z'
      }
    },
    {
      track: {
        id: '2',
        name: 'Test Track 2',
        duration_ms: 210000,
        artists: [{ name: 'Artist 2' }],
        album: { images: [{ url: 'http://test.com/cover2.jpg' }] },
        uri: 'spotify:track:2',
        added_at: '2023-01-02T00:00:00Z'
      }
    }
  ]
};

// Mock the global `fetch`
global.fetch = jest.fn();

const mockContext = {
  musichubPlaylistId: 'fake-playlist-id',
  setMusichubPlaylistId: jest.fn(),
  likedTracks: new Set(),
  handleTrackLike: jest.fn(),
  handlePlayTrack: jest.fn(),
  deviceId: 'test-device-id',
  playerStatus: {}, 
  player: {}
};

describe('fetchLikedSongs', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorage.setItem('spotify_access_token', 'fake-token');
    localStorage.setItem('musichub_playlist_id', 'fake-playlist-id');
  });

  it('successfully fetches and displays liked songs', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTracks)
    });

    render(
      <MemoryRouter>
        <MusicContext.Provider value={mockContext}>
          <LikedSongs />
        </MusicContext.Provider>
      </MemoryRouter>
    );

    // Verify loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `https://api.spotify.com/v1/playlists/${mockContext.musichubPlaylistId}/tracks`,
        { headers: { Authorization: 'Bearer fake-token' } }
      );
      expect(screen.getByText('Test Track 1')).toBeInTheDocument();
      expect(screen.getByText('Artist 1')).toBeInTheDocument();
    });
  });

  it('shows fallback UI for empty playlists', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [] })
    });

    render(
      <MemoryRouter>
        <MusicContext.Provider value={mockContext}>
          <LikedSongs />
        </MusicContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No track playing')).toBeInTheDocument();
    });
  });

  it('filters tracks using search input', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockTracks)
    });

    const { getByPlaceholderText, queryByText, getByText } = render(
      <MemoryRouter>
        <MusicContext.Provider value={mockContext}>
          <LikedSongs />
        </MusicContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => getByText('Test Track 1'));
    
    // Search for a non-existent track
    fireEvent.change(getByPlaceholderText('Search in liked songs'), {
      target: { value: 'NonExistentTrack' }
    });
    
    expect(queryByText('Test Track 1')).toBeNull();
  });
});
