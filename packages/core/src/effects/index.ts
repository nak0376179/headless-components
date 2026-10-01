// 演出系 (ページを丸ごと包むジョーク / イースターエッグ)。
// いずれも DOM を直接操作するコントローラで、React / Vue からは host 要素を渡して使う。
export {
  createJigsaw,
  buildJigsawPieces,
  jigsawSnapDistance,
  type JigsawController,
  type JigsawElements,
  type JigsawOptions,
  type JigsawPieceGeom,
  type JigsawState,
  type JigsawTransform,
} from "./jigsaw"
export {
  createShatterGlass,
  buildShards,
  type Shard,
  type ShardTransform,
  type ShatterGlassController,
  type ShatterGlassElements,
  type ShatterGlassOptions,
  type ShatterGlassState,
} from "./shatter"
export {
  createCheatCode,
  advanceCheatProgress,
  CHEAT_SEQUENCE,
  CHEAT_CONFETTI_COLORS,
  CHEAT_POP_ANIMATION,
  CHEAT_SECRET_Z_INDEX,
  type CheatCodeController,
  type CheatCodeElements,
  type CheatCodeOptions,
  type CheatCodeState,
} from "./cheatCode"
export {
  createPixelate,
  PIXELATE_MIN_SIZE,
  PIXELATE_MAX_SIZE,
  type PixelateController,
  type PixelateElements,
  type PixelateOptions,
  type PixelateState,
} from "./pixelate"
export {
  createSnowfall,
  depositSnow,
  relaxPile,
  SNOW_COLUMN_PX,
  type SnowfallController,
  type SnowfallElements,
  type SnowfallOptions,
  type SnowfallState,
} from "./snowfall"
