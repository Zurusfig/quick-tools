export type QrMatrix = { size: number; data: Uint8Array };

export type QrRenderOptions = {
  pixelSize: number;
  marginModules: number;
  fg: string;
  bg: string;
  roundness: number; // 0-100
  logoDataUrl?: string;
  logoScale: number; // fraction of pixelSize, e.g. 0.2
};

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  ctx.lineTo(x + radius, y + h);
  ctx.arcTo(x, y + h, x, y + h - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the logo image."));
    image.src = src;
  });
}

async function drawLogo(
  ctx: CanvasRenderingContext2D,
  pixelSize: number,
  bg: string,
  logoDataUrl: string,
  logoScale: number
) {
  const image = await loadImage(logoDataUrl);
  const logoSize = pixelSize * logoScale;
  const padding = logoSize * 0.12;
  const boxSize = logoSize + padding * 2;
  const boxPos = (pixelSize - boxSize) / 2;
  const logoPos = (pixelSize - logoSize) / 2;

  ctx.fillStyle = bg;
  roundedRectPath(ctx, boxPos, boxPos, boxSize, boxSize, boxSize * 0.18);
  ctx.fill();

  ctx.save();
  roundedRectPath(ctx, logoPos, logoPos, logoSize, logoSize, logoSize * 0.16);
  ctx.clip();
  ctx.drawImage(image, logoPos, logoPos, logoSize, logoSize);
  ctx.restore();
}

export async function renderQrToCanvas(
  canvas: HTMLCanvasElement,
  matrix: QrMatrix,
  options: QrRenderOptions
): Promise<void> {
  const { pixelSize, marginModules, fg, bg, roundness, logoDataUrl, logoScale } = options;
  const moduleCount = matrix.size;
  const totalModules = moduleCount + marginModules * 2;
  const cell = pixelSize / totalModules;

  canvas.width = pixelSize;
  canvas.height = pixelSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, pixelSize, pixelSize);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, pixelSize, pixelSize);

  ctx.fillStyle = fg;
  const radius = (roundness / 100) * (cell / 2);
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (!matrix.data[row * moduleCount + col]) continue;
      const x = (col + marginModules) * cell;
      const y = (row + marginModules) * cell;
      if (radius <= 0) {
        ctx.fillRect(x, y, cell, cell);
      } else {
        roundedRectPath(ctx, x, y, cell, cell, radius);
        ctx.fill();
      }
    }
  }

  if (logoDataUrl) {
    await drawLogo(ctx, pixelSize, bg, logoDataUrl, logoScale);
  }
}

export function renderQrToSvgString(matrix: QrMatrix, options: QrRenderOptions): string {
  const { pixelSize, marginModules, fg, bg, roundness, logoDataUrl, logoScale } = options;
  const moduleCount = matrix.size;
  const totalModules = moduleCount + marginModules * 2;
  const radius = (roundness / 100) * 0.5;

  let modules = "";
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (!matrix.data[row * moduleCount + col]) continue;
      const x = col + marginModules;
      const y = row + marginModules;
      modules +=
        radius > 0
          ? `<rect x="${x}" y="${y}" width="1" height="1" rx="${radius}" ry="${radius}" fill="${fg}"/>`
          : `<rect x="${x}" y="${y}" width="1" height="1" fill="${fg}"/>`;
    }
  }

  let logoMarkup = "";
  if (logoDataUrl) {
    const logoSizeModules = totalModules * logoScale;
    const paddingModules = logoSizeModules * 0.12;
    const boxSize = logoSizeModules + paddingModules * 2;
    const boxPos = (totalModules - boxSize) / 2;
    const logoPos = (totalModules - logoSizeModules) / 2;
    logoMarkup = `
      <rect x="${boxPos}" y="${boxPos}" width="${boxSize}" height="${boxSize}" rx="${boxSize * 0.18}" fill="${bg}"/>
      <clipPath id="qr-logo-clip">
        <rect x="${logoPos}" y="${logoPos}" width="${logoSizeModules}" height="${logoSizeModules}" rx="${logoSizeModules * 0.16}"/>
      </clipPath>
      <image x="${logoPos}" y="${logoPos}" width="${logoSizeModules}" height="${logoSizeModules}" href="${logoDataUrl}" preserveAspectRatio="xMidYMid slice" clip-path="url(#qr-logo-clip)"/>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" width="${pixelSize}" height="${pixelSize}"><rect width="${totalModules}" height="${totalModules}" fill="${bg}"/>${modules}${logoMarkup}</svg>`;
}
