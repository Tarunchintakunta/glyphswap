import hashlib
import sys
import urllib.request
from pathlib import Path

from glyphswap_inference.settings import settings

FONTS_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/"
LAMA_URL = "https://github.com/Sanster/models/releases/download/add_big_lama/big-lama.pt"

FONTS = {
    "inter/Inter[opsz,wght].ttf": "29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031",
    "roboto/Roboto[wdth,wght].ttf": "d7598e12c5dbef095ff8272cfc55da0250bd07fbdecbac8a530b9b277872a134",
    "opensans/OpenSans[wdth,wght].ttf": "36643644f318a812aab2d2ed3bb98f8cf0872527f835fe9398d95fe6b9adb878",
    "montserrat/Montserrat[wght].ttf": "0f7b311b2f3279e4eef9b2f968bcdbab6e28f4daeb1f049f4f278a902bcd82f7",
    "lato/Lato-Regular.ttf": "d636e4683231f931eda222d588e944d082bfd3bdba02f928bee461c0f185b251",
    "lato/Lato-Bold.ttf": "8a0aace75d33794eece4b28187bfc1df0bbd2888b5d8a56e01788c8d65d16be1",
    "merriweather/Merriweather[opsz,wdth,wght].ttf": (
        "d0ed0e359e396af7ad05e73dffd11a3a4c326ea0d0283c56bd9361cb2cc86a96"
    ),
    "playfairdisplay/PlayfairDisplay[wght].ttf": (
        "c40f2293766a503bc70cce9e512ef844a4ccb7cbcde792fe2ea31d191917d8d6"
    ),
    "lora/Lora[wght].ttf": "822a6621ccbe8d97d20ac88c1c41f5615c9c2c202eaa75f272cd452aac6475a7",
    "sourcecodepro/SourceCodePro[wght].ttf": (
        "b400fc584e10aff25d0e775ce181b4fc1c5ea1b5dc37b81aeb2084375b945790"
    ),
    "bebasneue/BebasNeue-Regular.ttf": (
        "08e4623805102d819f58601e46e345648846075e363b2ceb23313c2d1c83ec73"
    ),
    "oswald/Oswald[wght].ttf": "5b38c246e255a12f5712d640d56bcced0472466fc68983d2d0410ec0457c2817",
    "caveat/Caveat[wght].ttf": "0bdb6b660482d31531b3945849fba5916b3ef8695da7024a9e6b9ee3c4157988",
    "notosansdevanagari/NotoSansDevanagari[wdth,wght].ttf": (
        "14ec4af41f27482216d1c2229f417ff9b1425e1babb014e57d1d40d03229853e"
    ),
    "notosanstelugu/NotoSansTelugu[wdth,wght].ttf": (
        "e618af7bf999df192ed4f388eba2e563f2b5015034e9cbb317b5bd793bd7334d"
    ),
}
LAMA_SHA256 = "344c77bbcb158f17dd143070d1e789f38a66c04202311ae3a258ef66667a9ea9"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fetch(url: str, target: Path, expected: str) -> None:
    if target.exists() and sha256(target) == expected:
        print(f"ok   {target.name}")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    partial = target.with_suffix(target.suffix + ".part")
    quoted = url.replace("[", "%5B").replace("]", "%5D").replace(",", "%2C")
    urllib.request.urlretrieve(quoted, partial)
    actual = sha256(partial)
    if actual != expected:
        partial.unlink()
        sys.exit(f"checksum mismatch for {target.name}: {actual}")
    partial.rename(target)
    print(f"got  {target.name}")


def warm_ocr() -> None:
    from glyphswap_inference.ocr import available_engines, get_engine

    for name in available_engines():
        get_engine(name)
        print(f"ok   ocr:{name}")


def main() -> None:
    models = Path(settings.models_dir)
    for path, digest in FONTS.items():
        fetch(FONTS_URL + path, models / "fonts" / Path(path).name, digest)
    fetch(LAMA_URL, models / "big-lama.pt", LAMA_SHA256)
    warm_ocr()


if __name__ == "__main__":
    main()
