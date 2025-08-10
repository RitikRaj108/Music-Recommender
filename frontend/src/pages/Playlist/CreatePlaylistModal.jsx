import React from 'react';
import { X, Plus } from 'lucide-react';
import '../../Components/music-dashboard.css';

const CreatePlaylistModal = ({ isOpen, onClose, onCreate }) => {
  const [playlistName, setPlaylistName] = React.useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (playlistName.trim()) {
      onCreate(playlistName);
      setPlaylistName('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="playlist-modal">
        <div className="modal-header">
          <h3>Create New Playlist</h3>
          <button onClick={onClose} className="close-modal-btn">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="playlist-name">Playlist Name</label>
            <input
              id="playlist-name"
              type="text"
              placeholder="My Awesome Playlist"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Plus size={16} /> Create Playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePlaylistModal;