  async function analyze() {
    const url = document.getElementById('videoUrl').value.trim();
    const count = document.getElementById('commentCount').value;

    let videoId = null;
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname.includes("youtu.be")) {
        videoId = parsedUrl.pathname.replace("/", "");
      } else {
        videoId = parsedUrl.searchParams.get("v");
      }
    } catch {
      alert("Invalid YouTube URL");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, count: parseInt(count) })
      });

      const data = await response.json();

      const ctx = document.getElementById('sentimentChart').getContext('2d');
      if (window.myChart) window.myChart.destroy();

      window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Positive', 'Neutral', 'Negative'],
          datasets: [{
            label: 'Number of Comments',
            data: [data.positive, data.neutral, data.negative],
            backgroundColor: ['green', 'gray', 'red']
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });

      document.getElementById("results").innerText =
        `Positive: ${data.positive}, Neutral: ${data.neutral}, Negative: ${data.negative}`;
    } catch (err) {
      alert("Error contacting backend: " + err.message);
    }
  }

window.onload = function () {
  document.getElementById("analyzeForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    await analyze();
    return false;
  });
};