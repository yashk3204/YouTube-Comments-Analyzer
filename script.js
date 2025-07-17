  async function analyze() {
    const url = document.getElementById('videoUrl').value.trim();
    const count = document.getElementById('commentCount').value;

    document.getElementById("summarizeBtn").style.display = "none";
    document.getElementById("summaries").innerHTML = "";

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
      const response = await fetch(`https://ytca-backend.onrender.com/analyze`, {
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
      `;

      ["Positive", "Neutral", "Negative"].forEach(type => {
        const container = document.getElementById(type);
        container.innerHTML = "";
        data.comments[type].forEach(comment => {
            const p = document.createElement("p");
            p.textContent = comment;
            container.appendChild(p);
        });
      });

    } catch (err) {
      alert("Error contacting backend: " + err.message);
    }

    document.getElementById("summarizeBtn").style.display = "block";
  }

async function summarize() {
  const positive = Array.from(document.getElementById("Positive").children).map(p => p.textContent);
  const negative = Array.from(document.getElementById("Negative").children).map(p => p.textContent);

  const title = document.querySelector("#results h3")?.innerText || "";
  const channel = document.querySelector("#results strong")?.innerText || "";

  document.getElementById("summaries").innerHTML = "Summarizing…";

  try {
    const response = await fetch("https://ytca-backend.onrender.com/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positive_comments: positive,
        negative_comments: negative,
        title,
        channel
      })
    });

    const data = await response.json();
    let formattedPositiveSummary = "No positive comments, looks like it's a bad video!";
    let formattedNegativeSummary = "No negative comments, looks like it's a great video!";
    if(data.positiveSummary.length != 0) formattedPositiveSummary = formatText(data.positiveSummary);
    if(data.negativeSummary.length != 0) formattedNegativeSummary = formatText(data.negativeSummary);
    document.getElementById("summaries").innerHTML = `
      <div style="background:#f6f7fb;padding:16px;border-radius:6px;margin-bottom:12px;">
        <strong>📈 Positive Comments Summary:</strong>
        <p>${formattedPositiveSummary}</p>
      </div>
      <div style="background:#f6f7fb;padding:16px;border-radius:6px;">
        <strong>📉 Negative Comments Summary:</strong>
        <p>${formattedNegativeSummary}</p>
      </div>
    `;
  } catch (err) {
    document.getElementById("summaries").innerHTML = "Error summarizing comments: " + err.message;
  }
}

function formatText(str) {
    str = str.replace(/\[\d+\]/g, ''); // removing references
    let boldProcessed = '';
    let boldParts = str.split('**'); // ** for bold
    for (let i = 0; i < boldParts.length; i++) {
        boldProcessed += (i % 2 === 0) ? boldParts[i] : `<b>${boldParts[i]}</b>`;
    }
    let italicProcessed = '';
    let italicParts = boldProcessed.split('*'); // * for italics
    for (let i = 0; i < italicParts.length; i++) {
        italicProcessed += (i % 2 === 0) ? italicParts[i] : `<i>${italicParts[i]}</i>`;
    }
    const lines = italicProcessed.split('\n');
    let inList = false;
    let formatted = '';

    for (let line of lines) {
        if (line.trim().startsWith('- ')) { // - for bullet points
            if (!inList) {
                formatted += '<ul>\n';
                inList = true;
            }
            formatted += `  <li>${line.trim().slice(2)}</li>\n`;
        } else {
            if (inList) {
                formatted += '</ul>\n';
                inList = false;
            }
            formatted += `${line}\n`;
        }
    }
    if (inList) {
        formatted += '</ul>\n';
    }
    return formatted.trim();
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
  document.getElementById("commentCount").addEventListener("input", function () {
      document.getElementById("commentValue").textContent = this.value;
  });

  document.getElementById("analyzeForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    await analyze();
    return false;
  });

  document.getElementById("summarizeBtn").addEventListener("click", async function() {
    await summarize();
  });

};