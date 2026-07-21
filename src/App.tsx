import { useEffect, useState } from "react";
import ShapeFlowText, { type ObstacleSpec } from "./components/ShapeFlowText";

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const starShape = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <path fill="#a91d1c" d="M100 8l23 60 64 4-50 42 17 63-54-36-54 36 17-63-50-42 64-4z"/>
</svg>`);

const PARAGRAPH = `BTS's return with their fifth full-length studio album, ARIRANG, marked one of the most anticipated comebacks in modern music. After years of focusing on solo projects and completing their mandatory military service, the seven members reunited to create an album that reflects not only their artistic growth but also their connection to Korean identity and the fans who waited patiently for their return. The title itself references Korea's most iconic folk song, symbolizing both nostalgia and resilience while connecting the group's modern sound to centuries of cultural heritage.

Unlike many comeback albums that simply revisit previous styles, ARIRANG embraces a wide musical palette. The record blends alternative pop, hip-hop, electronic influences, emotional ballads, and experimental production while maintaining the storytelling that has always defined BTS. Every member participated in shaping the album, contributing lyrics, ideas, and perspectives gathered throughout the years they spent working individually. Rather than presenting themselves exactly as they were before, BTS chose to introduce a version of themselves that reflects maturity, confidence, and a deeper understanding of their own identity.

One of the album's strongest themes is belonging. Throughout the songs, BTS reflects on the meaning of home, friendship, memory, and the invisible bond between artists and fans. The album repeatedly returns to the idea that no matter how far someone travels, their roots remain an essential part of who they become. This philosophy explains why the group selected "Arirang," Korea's best-known traditional folk song, as the symbolic centerpiece of the project rather than choosing a more conventional title.

The release immediately became a global commercial success. ARIRANG debuted at number one on multiple charts around the world, continuing BTS's remarkable history of international achievements. In the United States, the album debuted at No. 1 on the Billboard 200, becoming the group's seventh chart-topping album and setting one of the biggest opening weeks ever achieved by a musical group in the modern Billboard era.

Its physical sales were equally impressive. The album recorded the largest first-week sales for a group in many years while also becoming one of the strongest-selling vinyl releases in recent history. Collectors around the world eagerly purchased multiple editions, demonstrating once again how BTS has helped redefine the value of physical albums in the streaming era. Industry analysts noted that the release contributed significantly to the renewed popularity of CDs and collectible album formats across global markets.`;

const PARAGRAPH2 = `Digital platforms also reflected the group's enormous influence. Songs from ARIRANG rapidly climbed streaming charts, while the album reached number one in dozens of countries shortly after release. Several tracks simultaneously occupied high positions on digital charts, illustrating not only the popularity of the lead single but also listeners' enthusiasm for experiencing the album as a complete artistic work. Fans across every continent celebrated the comeback through streaming events, listening parties, and community projects that highlighted the global nature of BTS's audience.

Beyond commercial success, ARIRANG represented an emotional reunion between BTS and ARMY. During interviews surrounding the release, the members explained that creating music together again felt both familiar and completely new. Their years apart allowed each member to develop unique musical colors, and those experiences naturally enriched the group's collective sound. The result is an album that honors the past without becoming trapped by nostalgia.

Following the album's release, BTS announced the massive ARIRANG World Tour, their first full-group world tour in years. The production features an ambitious stage design, large-scale visual effects, and performances spanning cities across Asia, Europe, and North America. The tour itself has been described as one of the largest ever organized by a K-pop group, demonstrating the extraordinary demand that still surrounds BTS after more than a decade together.

What makes BTS unique is not simply the number of awards or records they continue to collect, but the cultural impact they have generated worldwide. Millions of listeners have become interested in learning Korean, studying Hangul, exploring Korean history, tasting traditional cuisine, and discovering classic works such as the folk song Arirang because of the curiosity sparked by the group's music. Their influence extends far beyond entertainment, encouraging genuine cultural exchange between people from different countries and backgrounds.

The album also highlights BTS's continuing commitment to meaningful storytelling. Rather than focusing exclusively on fame or success, many of the songs discuss uncertainty, personal growth, gratitude, friendship, and the challenges of moving forward while carrying memories of the past. These themes resonate with listeners regardless of language because they reflect experiences shared by people everywhere.

Perhaps the most remarkable aspect of BTS's journey is the consistency with which they continue breaking expectations. From becoming the first Korean group to headline major international festivals, to earning multiple Grammy nominations, filling stadiums across continents, and repeatedly setting new chart records, BTS has continuously expanded what many believed was possible for Asian artists in the global music industry. Their achievements have inspired countless younger musicians to dream beyond national boundaries.

ARIRANG ultimately feels like both a beginning and a continuation. It celebrates where BTS came from while confidently looking toward the future. The album reminds listeners that music can preserve tradition without remaining confined to it, connecting generations through shared emotions and shared stories. Whether someone discovers BTS through this comeback or has followed them since their debut, ARIRANG serves as a powerful reminder that meaningful art has the ability to unite people across languages, cultures, and continents while creating memories that endure for years to come.`;

const MAX_COL_LEN = Math.max(PARAGRAPH.length, PARAGRAPH2.length);

const CHAR_WIDTH_RATIO = 0.52;
const BASE_FONT = 30;
const LINE_HEIGHT_RATIO = 1.5;
const HEADER_HEIGHT = 0;
const PADDING_X = 32;
const PADDING_TOP = 32;
const PADDING_BOTTOM = 32;

function makeObstacles(vw: number, vh: number): ObstacleSpec[] {
  const yScale = vh / 900;
  return [
    {
      id: "arirang",
      src: "/arirang.png",
      anchorX: vw * 0.15,
      anchorY: 120 * yScale,
      width: 120,
      height: 120,
      rotation: -8,
      label: "arirang",
      float: { amplitudeX: 14, amplitudeY: 10, speed: 0.6, phase: 0 },
    },
    {
      id: "star",
      src: starShape,
      anchorX: vw * 0.72,
      anchorY: 260 * yScale,
      width: 130,
      height: 130,
      rotation: 12,
      label: "estrella",
      float: { amplitudeX: 10, amplitudeY: 16, speed: 0.5, phase: 2 },
    },
    {
      id: "namjoon",
      src: "/namjoon.png",
      anchorX: vw * 0.38,
      anchorY: 430 * yScale,
      width: 120,
      height: 120,
      rotation: 6,
      label: "namjoon",
      float: { amplitudeX: 8, amplitudeY: 12, speed: 0.75, phase: 4 },
    },
    {
      id: "bangtan",
      src: "/bangtan.jpg",
      anchorX: vw * 0.85,
      anchorY: 500 * yScale,
      width: 100,
      height: 100,
      rotation: -5,
      label: "bangtan",
      float: { amplitudeX: 10, amplitudeY: 8, speed: 0.55, phase: 1 },
    },
    {
      id: "swimhat",
      src: "/swimhat.png",
      anchorX: vw * 0.55,
      anchorY: 150 * yScale,
      width: 90,
      height: 90,
      rotation: 10,
      label: "swimhat",
      float: { amplitudeX: 6, amplitudeY: 10, speed: 0.7, phase: 3 },
    },
    {
      id: "taehyung",
      src: "/taehyungswim.jpg",
      anchorX: vw * 0.25,
      anchorY: 650 * yScale,
      width: 110,
      height: 110,
      rotation: -3,
      label: "taehyung",
      float: { amplitudeX: 12, amplitudeY: 8, speed: 0.65, phase: 5 },
    },
    {
      id: "vminkook",
      src: "/vminkook.jpg",
      anchorX: vw * 0.65,
      anchorY: 700 * yScale,
      width: 95,
      height: 95,
      rotation: 7,
      label: "vminkook",
      float: { amplitudeX: 8, amplitudeY: 10, speed: 0.6, phase: 2.5 },
    },
    {
      id: "arirang7",
      src: "/BTS Arirang 7.jpg",
      anchorX: vw * 0.5,
      anchorY: 580 * yScale,
      width: 90,
      height: 90,
      rotation: -4,
      label: "BTS Arirang",
      float: { amplitudeX: 10, amplitudeY: 8, speed: 0.5, phase: 1.5 },
    },
  ];
}

export default function App() {
  const [vw, setVw] = useState(window.innerWidth);
  const [vh, setVh] = useState(window.innerHeight);

  useEffect(() => {
    function onResize() {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const availableHeight = vh - HEADER_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const textWidth = vw - PADDING_X * 2;
  const columnGap = 24;
  const colWidth = (textWidth - columnGap) / 2;
  const fontSize = Math.max(14, Math.min(BASE_FONT, Math.round(
    Math.sqrt(availableHeight * colWidth / (MAX_COL_LEN * CHAR_WIDTH_RATIO * LINE_HEIGHT_RATIO))
  )));
  const lineHeight = Math.round(fontSize * LINE_HEIGHT_RATIO);

  const obstacles = makeObstacles(vw, vh);

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        background: "#f6f3ee",
        fontFamily: "system-ui, sans-serif",
        paddingTop: PADDING_TOP,
      }}
    >
      <ShapeFlowText
        texts={[PARAGRAPH, PARAGRAPH2]}
        font={`${fontSize}px "Georgia", "Iowan Old Style", serif`}
        lineHeight={lineHeight}
        width={textWidth}
        containerWidth={vw}
        textOffsetX={PADDING_X}
        columns={2}
        columnGap={columnGap}
        color="#2a2620"
        padding={12}
        maxHeight={availableHeight}
        initialObstacles={obstacles}
      />
    </div>
  );
}
