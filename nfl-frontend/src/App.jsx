import { useEffect, useMemo, useState } from "react";
import "./App.css";

function getConfidence(homeWinProb) {
  const confidence = Math.abs(homeWinProb - 0.5);

  if (confidence >= 0.15) {
    return "High";
  }
  if (confidence >= 0.08) {
    return "Medium";
  }
  return "Low";
}

function getConfidencePercent(homeWinProb) {
  return Math.abs(homeWinProb - 0.5) * 200;
}

export default function App() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortMode, setSortMode] = useState("confidence");

  useEffect(() => {
    async function loadPredictions() {
      try {
        const res = await fetch("http://127.0.0.1:8000/predictions");
        if (!res.ok) {
          throw new Error("Failed to fetch predictions");
        }
        const data = await res.json();
        setPredictions(data);
      } catch (err) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    loadPredictions();
  }, []);

  const sortedPredictions = useMemo(() => {
    const items = [...predictions];

    if (sortMode === "week") {
      return items.sort((a, b) => {
        if (a.week !== b.week) {
          return a.week - b.week;
        }
        return a.home_team.localeCompare(b.home_team);
      });
    }

    return items.sort((a, b) => {
      const aConfidence = Math.abs(a.home_win_prob - 0.5);
      const bConfidence = Math.abs(b.home_win_prob - 0.5);
      return bConfidence - aConfidence;
    });
  }, [predictions, sortMode]);

  return (
    <div className="app">
      <header className="header">
        <h1>NFL Predictions</h1>
        <p>Model-backed game predictions for the latest season</p>
      </header>

      {loading && <p>Loading predictions...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <strong>{sortedPredictions.length}</strong> games loaded
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>Sort by</span>
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                <option value="confidence">Highest confidence</option>
                <option value="week">Week</option>
              </select>
            </label>
          </div>

          <div className="grid">
            {sortedPredictions.map((game, index) => {
              const confidenceLabel = getConfidence(game.home_win_prob);
              const confidencePercent = getConfidencePercent(game.home_win_prob);
              const predictedProb =
                game.predicted_winner === game.home_team
                  ? game.home_win_prob
                  : game.away_win_prob;

              return (
                <div
                  className="card"
                  key={`${game.week}-${game.home_team}-${game.away_team}-${index}`}
                >
                  <div className="topRow">
                    <span className="week">Week {game.week}</span>
                    <span className="season">{game.season}</span>
                  </div>

                  <div className="teams">
                    <div>
                      {game.away_team} @ {game.home_team}
                    </div>
                  </div>

                  <div className="winner">
                    Predicted winner: <strong>{game.predicted_winner}</strong>
                  </div>

                  <div style={{ marginBottom: "12px", fontSize: "14px" }}>
                    Confidence: <strong>{confidenceLabel}</strong> ({confidencePercent.toFixed(1)}%)
                  </div>

                  <div
                    style={{
                      width: "100%",
                      height: "10px",
                      background: "#e7e7e7",
                      borderRadius: "999px",
                      overflow: "hidden",
                      marginBottom: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: `${(predictedProb * 100).toFixed(1)}%`,
                        height: "100%",
                        background: predictedProb >= 0.6 ? "#16a34a" : predictedProb >= 0.55 ? "#ca8a04" : "#6b7280",
                      }}
                    />
                  </div>

                  <div className="probs">
                    <div>
                      {game.home_team} win prob: {(game.home_win_prob * 100).toFixed(1)}%
                    </div>
                    <div>
                      {game.away_team} win prob: {(game.away_win_prob * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}