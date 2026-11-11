/** Capture the actual renderer frame and real HUD before WebGL discards it. */
export async function captureGameFrame(page, path) {
  await page.evaluate(async () => {
    const e = window.__sack;
    e.running = false; cancelAnimationFrame(e.raf); clearTimeout(e.loopBackup);
    // Controlled movement can travel far between GPU frames. Advance the normal
    // update/draw path so camera smoothing reaches the destination as well.
    // Only intermediate GPU submissions are skipped; the final frame is real.
    const renderer = e.world3d.renderer;
    const render = renderer.render;
    renderer.render = () => {};
    try { for (let i = 0; i < 60; i++) { e.update(1 / 60); e.draw(); } }
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
  });
  try { await page.screenshot({ path, timeout: 60000 }); }
  finally {
    await page.evaluate(() => {
      if (window.__sack) window.__sack.world3d.renderer.domElement.style.visibility = "";
      document.getElementById("qa-rendered-frame")?.remove();
    });
  }
}
