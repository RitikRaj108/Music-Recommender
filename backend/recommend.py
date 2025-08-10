import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import NearestNeighbors

# -----------------------
# 1. Load and Prepare Data
# -----------------------

# Assume you have a CSV file "songs_features.csv" with columns such as:
# "song_id", "title", "artist", "danceability", "energy", "tempo", etc.
data = pd.read_csv('songs_features.csv')

# Define the audio feature columns to be used for recommendation
feature_columns = ['danceability', 'energy', 'speechiness', 'acousticness', 'instrumentalness', 'liveness', 'valence', 'tempo']

# Check that the required columns exist in the dataset
if not set(feature_columns).issubset(data.columns):
    raise ValueError("Dataset is missing one or more of the required audio feature columns.")

# Extract features and scale them (scaling is important for distance-based recommendations)
features = data[feature_columns].values
scaler = StandardScaler()
features_scaled = scaler.fit_transform(features)

# -----------------------
# 2. Build the Nearest Neighbors Model
# -----------------------

# We use cosine distance to determine similarity in the audio feature space.
# Note: NearestNeighbors returns the closest neighbors based on the specified metric.
nbrs_model = NearestNeighbors(n_neighbors=6, metric='cosine')  # Using 6 neighbors to account for the song itself
nbrs_model.fit(features_scaled)

# -----------------------
# 3. Define a Recommendation Function
# -----------------------

def recommend_songs(song_id, data, features_scaled, model, k=5):
    """
    Recommend k songs similar to the song with the given song_id.

    Parameters:
        song_id (str/int): The unique identifier for the song to base recommendations on.
        data (DataFrame): The song metadata, including at least the song id, title, and artist.
        features_scaled (ndarray): The preprocessed (e.g., scaled) feature matrix.
        model (NearestNeighbors): The fitted nearest neighbors model.
        k (int): The number of recommendations to return.

    Returns:
        recommendations (DataFrame): A subset of the original data with the recommended songs.
    """
    # Locate the index of the song in the dataset
    song_idx = data.index[data['song_id'] == song_id].tolist()

    if not song_idx:
        raise ValueError(f"Song ID {song_id} not found in the dataset.")

    song_idx = song_idx[0]

    # Reshape the song's feature vector to match the expected shape (1, n_features)
    song_feature = features_scaled[song_idx].reshape(1, -1)

    # Find the nearest neighbors (includes the query song as the first result)
    distances, indices = model.kneighbors(song_feature, n_neighbors=k+1)

    # Exclude the first neighbor (the song itself)
    similar_indices = indices.flatten()[1:]

    # Retrieve recommended songs from the data
    recommendations = data.iloc[similar_indices]

    # Optionally add a distance column for additional info on similarity
    recommendations = recommendations.copy()
    recommendations['similarity_distance'] = distances.flatten()[1:]

    return recommendations

# -----------------------
# 4. Usage Example
# -----------------------

# Example: Recommend 5 songs similar to a specified song_id (change "YOUR_SONG_ID" accordingly)
YOUR_SONG_ID = "12345"  # Replace with an actual song id from your dataset

try:
    similar_songs = recommend_songs(YOUR_SONG_ID, data, features_scaled, nbrs_model, k=5)
    print("Recommended Songs:")
    print(similar_songs[['song_id', 'title', 'artist', 'similarity_distance']])
except ValueError as e:
    print(e)
