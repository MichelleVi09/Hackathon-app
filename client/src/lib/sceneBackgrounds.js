function buildNatureScene(skyTop, skyBottom, hillOne, hillTwo, hillThree, leafOne, leafTwo) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1100">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${skyTop}"/>
          <stop offset="100%" stop-color="${skyBottom}"/>
        </linearGradient>
        <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="24"/>
        </filter>
      </defs>
      <rect width="1600" height="1100" fill="url(#sky)"/>
      <circle cx="1220" cy="180" r="110" fill="#f4ffe4" opacity="0.42"/>
      <ellipse cx="260" cy="180" rx="170" ry="64" fill="#f6fff0" opacity="0.38" filter="url(#blur)"/>
      <ellipse cx="520" cy="220" rx="150" ry="56" fill="#f6fff0" opacity="0.3" filter="url(#blur)"/>
      <path d="M0 760 C180 640 360 650 560 760 C720 850 920 860 1120 720 C1290 610 1450 650 1600 730 V1100 H0Z" fill="${hillOne}"/>
      <path d="M0 820 C190 720 380 730 590 830 C760 915 1000 920 1190 805 C1360 700 1485 720 1600 780 V1100 H0Z" fill="${hillTwo}"/>
      <path d="M0 900 C220 810 440 840 660 910 C860 975 1100 980 1310 900 C1430 854 1510 850 1600 870 V1100 H0Z" fill="${hillThree}"/>
      <g opacity="0.82">
        <path d="M1335 438 C1395 320 1480 294 1538 324 C1498 392 1450 454 1382 506 C1340 470 1324 456 1335 438Z" fill="${leafOne}"/>
        <path d="M117 560 C174 444 258 418 314 450 C270 514 222 572 154 624 C118 590 104 576 117 560Z" fill="${leafTwo}"/>
        <path d="M1508 604 C1552 526 1600 502 1600 502 V666 C1560 650 1530 630 1508 604Z" fill="${leafTwo}" opacity="0.78"/>
      </g>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildOceanScene(skyTop, skyBottom, waterOne, waterTwo, reefOne, reefTwo, coralOne, coralTwo) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1100">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${skyTop}"/>
          <stop offset="100%" stop-color="${skyBottom}"/>
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${waterOne}"/>
          <stop offset="100%" stop-color="${waterTwo}"/>
        </linearGradient>
      </defs>
      <rect width="1600" height="1100" fill="url(#sky)"/>
      <rect width="1600" height="1100" fill="url(#water)" opacity="0.82"/>
      <circle cx="1240" cy="180" r="96" fill="#dbf7ff" opacity="0.18"/>
      <ellipse cx="320" cy="180" rx="180" ry="60" fill="#dffbff" opacity="0.12"/>
      <path d="M0 740 C200 672 416 684 618 742 C810 796 1048 804 1260 752 C1386 720 1508 708 1600 722 V1100 H0Z" fill="${reefOne}" opacity="0.84"/>
      <path d="M0 826 C220 772 454 798 664 852 C856 902 1112 916 1326 864 C1448 834 1534 830 1600 842 V1100 H0Z" fill="${reefTwo}" opacity="0.9"/>
      <path d="M0 1100 V950 C82 926 148 892 192 840 C226 800 244 774 266 742 C292 774 308 810 320 860 C336 930 344 996 354 1100Z" fill="${coralOne}" opacity="0.92"/>
      <path d="M1466 1100 C1476 1004 1488 930 1506 866 C1522 808 1544 766 1576 726 C1590 778 1598 860 1600 940 V1100Z" fill="${coralTwo}" opacity="0.92"/>
      <path d="M1248 1100 C1260 1008 1278 946 1302 894 C1326 840 1360 798 1412 758 C1404 840 1400 918 1402 1002 C1404 1042 1410 1074 1418 1100Z" fill="${coralOne}" opacity="0.76"/>
      <g opacity="0.28" fill="#dffcff">
        <path d="M0 330 C152 302 330 304 500 332 C696 364 872 368 1084 334 C1268 306 1448 310 1600 338 V360 C1448 332 1280 330 1092 358 C874 392 694 388 494 356 C328 330 154 328 0 354Z"/>
        <path d="M0 494 C170 466 346 470 530 500 C706 528 884 532 1080 498 C1266 466 1448 470 1600 502 V520 C1430 494 1266 494 1080 522 C882 552 712 548 522 520 C344 494 170 492 0 518Z"/>
      </g>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const NATURE_BACKGROUNDS = [
  buildNatureScene("#dff4d2", "#87bb87", "#6ea86a", "#4f8351", "#2f5b38", "#85b76d", "#c8e2a7"),
  buildNatureScene("#d8f0db", "#7fbe9a", "#74b189", "#56896f", "#355c49", "#7fbc7f", "#b7deb5"),
  buildNatureScene("#e4f8d9", "#9ece89", "#81b46d", "#5f8f53", "#406743", "#9ed676", "#d0ec9f"),
  buildNatureScene("#e5f5df", "#8cc49d", "#79ae82", "#537f61", "#2e5143", "#89c58c", "#c2e0c7")
];

export const OCEAN_BACKGROUNDS = [
  buildOceanScene("#b5edf8", "#1c6786", "#69c7df", "#144b73", "#245f67", "#183a53", "#ff8b5f", "#ffb16e"),
  buildOceanScene("#c2f2ff", "#236b8b", "#79d2e8", "#194c74", "#2f6e72", "#1b435e", "#ff9d7a", "#ffd08f"),
  buildOceanScene("#b7efff", "#1e6284", "#68c9eb", "#0f4269", "#326972", "#173750", "#ff8d85", "#ffc07a")
];

export function pickRandomBackground(list) {
  return list[Math.floor(Math.random() * list.length)];
}
