// src/components/Playlist/AddToPlaylistModal.jsx
import React from 'react';
import PropTypes from 'prop-types';
import '../../Components/modal.css'; // Ensure you have styling for modal overlay

const AddToPlaylistModal = ({ isOpen, onClose, playlists, track, onAdd }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add "{track.title}" to a Playlist</h2>
        <ul className="playlist-list">
          {playlists.map((playlist) => (
            <li 
              key={playlist.spotifyId} 
              className="playlist-item"
              onClick={() => onAdd(playlist)}
            >
              {playlist.name}
            </li>
          ))}
        </ul>
        <button onClick={onClose} className="cancel-btn">Cancel</button>
      </div>
    </div>
  );
};

AddToPlaylistModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  playlists: PropTypes.array.isRequired,
  track: PropTypes.object.isRequired,
  onAdd: PropTypes.func.isRequired
};

export default AddToPlaylistModal;
