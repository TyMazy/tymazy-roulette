const spinBtn = document.getElementById("spinBtn");
const resultEl = document.getElementById("result");
const disc = document.getElementById("disc");

let spinning = false;

function animateSpin() {
  // animation visuelle simple
  const turns = 4 + Math.random() * 3;
  const deg = turns * 360 + Math.floor(Math.random() * 360);
  disc.style.transition = "transform 2.2s cubic-bezier(.17,.67,.2,1)";
  disc.style.transform = `rotate(${deg}deg)`;
  return new Promise((r) => setTimeout(r, 2300));
}

spinBtn.addEventListener("click", async () => {
  if (spinning) return;
  spinning = true;
  resultEl.textContent = "Résultat : tirage en cours…";

  try {
    // appel API (cookies inclus automatiquement)
    const res = await fetch("/api/spin", { method: "GET", credentials: 
"include" });

    await animateSpin();

    const data = await res.json();

    if (!res.ok) {
      resultEl.textContent = `Erreur : ${data.error || "inconnue"}`;
      spinning = false;
      return;
    }

    if (data.result === "win") {
      resultEl.textContent = `🎉 GAGNÉ : ${data.prize}`;
    } else {
      resultEl.textContent = `😅 Perdu : ${data.message}`;
    }
  } catch (e) {
    resultEl.textContent = "Erreur : impossible de contacter /api/spin";
  } finally {
    spinning = false;
  }
});

