/** Painted court and jack-o-lantern maps. Used only while Halloween is on. */

export function paintCourt(mode: "street" | "gym"): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1024;
  const g = c.getContext("2d");
  if (!g) return c;
  if (mode === "gym") {
    g.fillStyle = "#2a1a24";
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 18; i++) {
      g.fillStyle = i % 2 ? "#3a2430" : "#24141c";
      g.fillRect(0, i * 58, 1024, 54);
      g.fillStyle = "rgba(255,122,26,0.05)";
      g.fillRect(0, i * 58, 1024, 4);
    }
  } else {
    g.fillStyle = "#1a1018";
    g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 2200; i++) {
      g.fillStyle = i % 4 === 0 ? "rgba(255,120,30,0.07)" : "rgba(0,0,0,0.28)";
      g.fillRect((i * 47) % 1024, (i * 91) % 1024, 2 + (i % 3), 2);
    }
    g.strokeStyle = "rgba(8,4,8,0.9)";
    g.lineWidth = 3;
    for (let i = 0; i < 22; i++) {
      g.beginPath();
      let x = (i * 80) % 1024;
      let y = (i * 130) % 1024;
      g.moveTo(x, y);
      for (let k = 0; k < 7; k++) {
        x += ((i * 17 + k * 40) % 90) - 45;
        y += ((i * 29 + k * 23) % 80) - 20;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  g.strokeStyle = "#ff7a1a";
  g.lineWidth = 14;
  g.strokeRect(46, 46, 932, 932);
  g.beginPath();
  g.moveTo(46, 512);
  g.lineTo(978, 512);
  g.stroke();
  g.strokeStyle = "#39ff14";
  g.lineWidth = 8;
  g.beginPath();
  g.arc(512, 512, 108, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = "#ff7a1a";
  g.lineWidth = 8;
  for (const y of [150, 874]) {
    g.strokeRect(360, y - 70, 304, 140);
    g.beginPath();
    g.arc(512, y, 70, 0, Math.PI, y < 500);
    g.stroke();
  }
  g.fillStyle = "#ff6a1a";
  g.beginPath();
  g.arc(512, 512, 62, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#140804";
  const eye = (x: number) => {
    g.beginPath();
    g.moveTo(x, 488);
    g.lineTo(x + 22, 514);
    g.lineTo(x - 22, 514);
    g.fill();
  };
  eye(478);
  eye(546);
  g.fillRect(496, 528, 30, 10);
  g.beginPath();
  g.moveTo(470, 548);
  g.lineTo(490, 536);
  g.lineTo(512, 556);
  g.lineTo(534, 536);
  g.lineTo(554, 552);
  g.lineTo(548, 568);
  g.lineTo(476, 568);
  g.fill();
  g.fillStyle = "#14520c";
  g.fillRect(500, 448, 24, 16);
  g.fillStyle = "#39ff14";
  g.font = "700 54px sans-serif";
  g.textAlign = "center";
  g.fillText("AFTER DARK", 512, 118);
  g.fillStyle = "#ffb15a";
  g.font = "700 48px sans-serif";
  g.fillText("SACKROW", 512, 940);
  return c;
}

export function paintPumpkinFace(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d");
  if (!g) return c;
  g.fillStyle = "#ff6a1a";
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#2a1208";
  for (let i = 0; i < 8; i++) g.fillRect(i * 16, 0, 2, 128);
  g.fillStyle = "#120804";
  g.beginPath();
  g.moveTo(36, 42);
  g.lineTo(54, 66);
  g.lineTo(18, 66);
  g.fill();
  g.beginPath();
  g.moveTo(92, 42);
  g.lineTo(110, 66);
  g.lineTo(74, 66);
  g.fill();
  g.fillRect(56, 74, 16, 10);
  g.beginPath();
  g.moveTo(30, 92);
  g.lineTo(46, 82);
  g.lineTo(62, 98);
  g.lineTo(78, 80);
  g.lineTo(96, 98);
  g.lineTo(104, 86);
  g.lineTo(100, 108);
  g.lineTo(28, 108);
  g.fill();
  return c;
}
