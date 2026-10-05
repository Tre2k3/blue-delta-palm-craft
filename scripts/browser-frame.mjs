/** Freeze the real WebGL frame while the page compositor captures its HUD. */
export async function captureGameFrame(page, path) {
  const wasRunning = await page.evaluate(async () => {
    const e = window.__sack;
    if (!e?.world3d?.renderer) return null;
    const running = e.running;
    e.running = false; cancelAnimationFrame(e.raf); clearTimeout(e.loopBackup);
    const renderer = e.world3d.renderer;
    const render = renderer.render;
    // Settle the normal camera path without advancing missions, shots or input.
    renderer.render = () => {};
    try { for (let i = 0; i < 60; i++) e.draw(); }
    finally { renderer.render = render; }
    e.draw();
    const canvas = renderer.domElement;
    const frame = document.createElement("img");
    frame.id = "qa-rendered-frame";
    frame.className = canvas.className;
    frame.style.cssText = canvas.style.cssText;
    frame.style.pointerEvents = "none";
    frame.src = canvas.toDataURL("image/png");
    await frame.decode();
    canvas.insertAdjacentElement("afterend", frame);
    canvas.style.visibility = "hidden";
    return running;
  });
  try { await page.screenshot({ path, timeout: 60000, animations: "disabled" }); }
  finally {
    await page.evaluate((running) => {
      if (window.__sack?.world3d) window.__sack.world3d.renderer.domElement.style.visibility = "";
      document.getElementById("qa-rendered-frame")?.remove();
      if (running) window.__sack.startLoop();
    }, wasRunning);
  }
}
