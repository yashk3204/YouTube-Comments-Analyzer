  async function analyze() {
    const url = document.getElementById('videoUrl').value.trim();

    document.getElementById("commentCount").addEventListener("input", function () {
        document.getElementById("commentValue").textContent = this.value;
    });
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

      document.getElementById("results").innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
          <img src="${data.thumbnail}" alt="Thumbnail" style="width: 120px; border-radius: 8px;">
          <div>
            <h3 style="margin: 0;">${data.title}</h3>
            <p style="margin: 4px 0;">Channel: <strong>${data.channel}</strong></p>
            <p>👍 ${data.positive} | 😐 ${data.neutral} | 👎 ${data.negative}</p>
          </div>
        </div>
        <p><a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">🔗 Watch Video</a></p>
      `;

      ["Positive", "Neutral", "Negative"].forEach(type => {
        const container = document.getElementById(type);
        container.innerHTML = ""; // clear previous
        data.comments[type].forEach(comment => {
            const p = document.createElement("p");
            p.textContent = comment;
            container.appendChild(p);
        });
      });

    } catch (err) {
      alert("Error contacting backend: " + err.message);
    }
  }

function toggleComments(type) {
  const types = ['Positive', 'Neutral', 'Negative'];
  types.forEach(t => {
    if (t !== type) {
      document.getElementById(t).style.display = "none";
    }
  });
  const section = document.getElementById(type);
  section.style.display = section.style.display === "none" ? "block" : "none";
}

window.onload = function () {
  document.getElementById("analyzeForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    await analyze();
    return false;
  });
};