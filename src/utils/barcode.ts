/**
 * High-precision, pure TypeScript Code-128 barcode generator.
 * Produces crisp, vector SVG barcodes fully readable by standard hardware barcode scanners.
 */

// Code 128 patterns (widths of bars and spaces: 6 elements per symbol, sum = 11 modules, except stop = 13 modules)
const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (104=Start B, 106=Stop)
];

const START_CODE_B = 104;
const STOP_CODE = 106;

/**
 * Encodes text into Code128 pattern array and generates SVG paths.
 */
export function generateBarcodeSVG(
  text: string,
  options?: {
    height?: number;
    barWidth?: number;
    showText?: boolean;
    quietZone?: boolean;
  }
): { svgXml: string; width: number; height: number } {
  const cleanText = text.trim() || "000000";
  const height = options?.height ?? 60;
  const barWidth = options?.barWidth ?? 2;
  const showText = options?.showText ?? true;
  const quietZone = options?.quietZone ?? true;

  // Calculate Code128-B values
  const values: number[] = [START_CODE_B];
  let checksum = START_CODE_B;

  for (let i = 0; i < cleanText.length; i++) {
    const code = cleanText.charCodeAt(i) - 32;
    const validCode = code >= 0 && code <= 95 ? code : 0;
    values.push(validCode);
    checksum += validCode * (i + 1);
  }

  const checkValue = checksum % 103;
  values.push(checkValue);
  values.push(STOP_CODE);

  // Generate binary module string (1 = bar, 0 = space)
  let binaryString = "";
  for (const val of values) {
    const pattern = CODE128_PATTERNS[val] || CODE128_PATTERNS[0];
    let isBar = true;
    for (const char of pattern) {
      const runLength = parseInt(char, 10);
      binaryString += (isBar ? "1" : "0").repeat(runLength);
      isBar = !isBar;
    }
  }

  const quietModules = quietZone ? 10 : 2;
  const totalModules = binaryString.length + quietModules * 2;
  const totalWidth = totalModules * barWidth;
  const totalHeight = showText ? height + 16 : height;

  // Build SVG rects
  let rectsSvg = "";
  let xPos = quietModules * barWidth;

  let currentRun = 0;
  for (let i = 0; i < binaryString.length; i++) {
    if (binaryString[i] === "1") {
      currentRun++;
    } else {
      if (currentRun > 0) {
        const w = currentRun * barWidth;
        const x = xPos;
        rectsSvg += `<rect x="${x}" y="0" width="${w}" height="${height}" fill="#000000" />`;
        xPos += w;
        currentRun = 0;
      }
      xPos += barWidth;
    }
  }
  if (currentRun > 0) {
    const w = currentRun * barWidth;
    rectsSvg += `<rect x="${xPos}" y="0" width="${w}" height="${height}" fill="#000000" />`;
  }

  // Keep a fixed, consistent font-size for every barcode's number. Only ever
  // shrink (never stretch) via textLength, so short and long codes render at
  // the same visual size instead of some looking oversized relative to others.
  const FONT_SIZE = 11;
  const MONOSPACE_CHAR_WIDTH_RATIO = 0.6;
  const textFitWidth = Math.max(totalWidth - quietModules * barWidth, totalWidth * 0.6);
  const naturalTextWidth = cleanText.length * FONT_SIZE * MONOSPACE_CHAR_WIDTH_RATIO;
  const needsShrink = naturalTextWidth > textFitWidth;
  const textSvg = showText
    ? `<text x="${totalWidth / 2}" y="${height + 12}" font-family="monospace, monospace" font-size="${FONT_SIZE}" font-weight="bold" fill="#1e293b" text-anchor="middle"${
        needsShrink ? ` textLength="${textFitWidth}" lengthAdjust="spacingAndGlyphs"` : ""
      }>${cleanText}</text>`
    : "";

  const svgXml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}">
    <rect width="${totalWidth}" height="${totalHeight}" fill="#ffffff" />
    ${rectsSvg}
    ${textSvg}
  </svg>`;

  return {
    svgXml,
    width: totalWidth,
    height: totalHeight,
  };
}
