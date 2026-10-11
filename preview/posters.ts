// Self-contained fictional demo artwork. Never used for a real game's poster.
export function demoPoster(name: string, index: number): string {
  const colors = ["#177b9d", "#a44984", "#c49646", "#338d7f"];
  const color = colors[index % colors.length];
  const escaped = name.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const words = escaped.split(" ");
  const lines = words.map((word, i) => `<tspan x="40" dy="${i === 0 ? 0 : 48}">${word.toUpperCase()}</tspan>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#091323"/></linearGradient></defs><rect width="600" height="900" fill="url(#g)"/><circle cx="420" cy="280" r="180" fill="none" stroke="#ffffff33" stroke-width="2"/><circle cx="420" cy="280" r="130" fill="none" stroke="#ffffff22" stroke-width="35"/><path d="M-50 640L600 220M0 800L650 380" stroke="#fff" stroke-opacity=".12" stroke-width="70"/><path d="M40 460L150 360L310 460L460 300L620 440V900H40Z" fill="#091323" opacity=".4"/><text x="40" y="640" fill="#fff" font-family="sans-serif" font-size="44" font-weight="700">${lines}</text><text x="40" y="850" fill="#c7dbe1" font-family="sans-serif" font-size="17" letter-spacing="5">FICTIONAL DEMO POSTER</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
