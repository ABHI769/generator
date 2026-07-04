const form = document.getElementById("price-form");
const submitBtn = document.getElementById("submit-btn");
const btnText = submitBtn.querySelector(".btn-text");
const btnLoader = submitBtn.querySelector(".btn-loader");
const resultCard = document.getElementById("result-card");
const resultContent = document.getElementById("result-content");
const errorCard = document.getElementById("error-card");
const errorMessage = document.getElementById("error-message");

function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.classList.toggle("hidden", loading);
  btnLoader.classList.toggle("hidden", !loading);
}

function hideResults() {
  resultCard.classList.add("hidden");
  errorCard.classList.add("hidden");
}

function showError(message) {
  errorCard.classList.remove("hidden");
  resultCard.classList.add("hidden");
  errorMessage.textContent = message;
}

function renderSources(sources) {
  if (!sources || sources.length === 0) return "";

  const items = sources
    .map(
      (source) => `
        <li>
          <a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.title}</a>
          <p>${source.snippet || ""}</p>
        </li>
      `
    )
    .join("");

  return `
    <div class="sources">
      <h3>Online sources used</h3>
      <ul class="source-list">${items}</ul>
    </div>
  `;
}

function showResult(data) {
  resultCard.classList.remove("hidden");
  errorCard.classList.add("hidden");

  const { vehicle, price, sources, disclaimer } = data;

  resultContent.innerHTML = `
    <div class="price-display">
      <div class="price-main">${price.estimated_formatted}</div>
      <div class="price-range">Range: ${price.low_formatted} – ${price.high_formatted}</div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span>Brand</span>
        <strong>${vehicle.name}</strong>
      </div>
      <div class="meta-item">
        <span>Model</span>
        <strong>${vehicle.model}</strong>
      </div>
      <div class="meta-item">
        <span>Type</span>
        <strong>${vehicle.vehicle_type}</strong>
      </div>
      <div class="meta-item">
        <span>Owner</span>
        <strong>${vehicle.owner}</strong>
      </div>
    </div>

    ${renderSources(sources)}

    <p class="disclaimer">${disclaimer}</p>
  `;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideResults();
  setLoading(true);

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch("/api/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || "Something went wrong. Please try again.");
      return;
    }

    showResult(data);
  } catch {
    showError("Could not reach the server. Make sure the app is running.");
  } finally {
    setLoading(false);
  }
});
