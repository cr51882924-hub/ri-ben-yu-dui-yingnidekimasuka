# GrooveSync MV Studio — プロジェクト引き継ぎ書 (HANDOVER.md)

## 1. ユーザー様のご要望・背景
- **目的**: ご自身で制作されたオリジナル楽曲と、用意した人物写真（または動画）を組み合わせて、スマートフォン（iPhone）だけで完結できる本格AIリップシンクMV制作Webアプリを作る。
- **UI・操作性の重要ルール（最優先）**:
  - ユーザー様は**iPhone**から操作されており、**視力への配慮（特大文字・高コントラスト・指で押しやすい特大ボタン・画面いっぱいのスクロールしやすいUI）**が必須。
  - 小さな文字や細かすぎるボタンはNG。
  - iPhoneの音声入力（ディクテーション）を使ってチャットされることがあるため、多少の音声認識の誤変換があっても文脈から意図を汲み取って対応すること。

## 2. 決定事項・現在の進捗（v15.0: 最新世代 OmniHuman 2.0 ＆ Kling 4.0 ＆「顔崩壊・妖怪化防止エンジン」搭載完了）
1. **【2026年10月最新AIモデルへ全面刷新（v15.0）】**:
   - **`👑 🎤 ByteDance OmniHuman 2.0` (`bytedance/omnihuman/v2`)**: 2026年10月15日リリースの最新世代モデルを最上位（デフォルト）に搭載。日本語・英語プロンプト両対応、4秒〜最大5分対応。
   - **`✨ Sync-3 Avatar` (`fal-ai/sync-lipsync/v3/image-to-video`)**: 元写真の顔・目・背景を一切変形させず、口元のみを直接リップシンクさせる最新Sync v3静止画直結モデルを搭載。
   - **`🎬 【改善A・最新v4】2段階ハイブリッド（Kling 4.0 ➔ Sync v3 / HeyGen v3 / VEED v2）`**: 第1段階に2026年10月16日リリースの最新 **`kling/v4/image-to-video`（Kling 4.0）** を搭載（`start_image_url` と `end_image_url` の両方に元写真をロックして顔変わりを防止）。第2段階に `fal-ai/sync-lipsync/v3` / `fal-ai/heygen/v3/lipsync/precision` / `veed/lipsync/v2` を選択可能。
   - **`🌟 Mirage Avatar X` (`mirage-api/avatar-x/reference-to-video`)**: 2026年8月リリースの最新リファレンス歌唱アバターを搭載。
   - **`🎥 Kling 4.0` (`kling/v4/image-to-video`)**: 単体の全身＆映画カメラ演出動画モードも最新の Kling 4.0 にアップグレード。
2. **【最重要】「妖怪・悪魔のような顔崩壊」の真因解明と完全防止ロック（`enableIdentityLock` 標準ON）**:
   - **真因①（過大音量による「絶叫顔」誤作動）**: マスタリング済みの楽曲（0 dBFS）をそのまま口パクAIに渡すと、会話音量（-16 dBFS）で学習されたAIが「絶叫・咆哮している」と判定し、顎を2倍に裂いて歯茎を剥き出しにし、目を血走らせて悪魔・妖怪のような顔に変形させていた。
   - **対策①（`buildGentleLipsyncBuffer`）**: 口パクAIに渡すガイド音声（およびDemucs分離ボーカル）のピーク音量をソフトリミッターで `-13 dBFS`（`0.22`）の優しい会話レベルに自動減衰。これにより口元が上品・自然に動き、完成映像には `fal-ai/ffmpeg-api/merge-audio-video` で元の100%大迫力の楽曲を再合成。
   - **真因②（プロンプトの顔強調ワードによる目の見開き）**: `facial features, eye shape, keeping eyes open, passionate` といった単語が拡散モデルの目・歯へのアテンションを暴走させていたため、これらを完全撤廃し穏やかな微笑みプロンプトに刷新。
3. **【改善B】AIボーカル自動分離＆高音質伴奏の再合成（`fal-ai/demucs` ➔ ソフト音量調整 ➔ リップシンク ➔ `fal-ai/ffmpeg-api/merge-audio-video`）**:
   - STEP 4 の `②【改善B】AIボーカル自動分離` パネルにて、標準で **「✨ ON：歌声だけ抽出して口パク（推奨）」** を有効化。
   - 生成ボタンを押すと、まず `fal-ai/demucs` で楽曲から伴奏（ドラム・ギター等）を取り除いた「ボーカル声のみ（`vocals.mp3`）」を自動抽出し、楽器音による口の誤作動を防止。
   - 抽出されたボーカル音声は画面内の `#isolatedVocalPreviewBox` でも試聴可能。
   - 口パク映像の完成後、自動的に `fal-ai/ffmpeg-api/merge-audio-video` で元の伴奏入り高音質音源を動画へ合体して出力。
2. **【改善A】プロ品質・2段階ハイブリッド自動生成モード（`Kling 3.0 Pro` ➔ `Sync Lipsync v3` / `Kling LipSync`）**:
   - STEP 4 のAIモデル選択の最上位（標準選択）に **`👑 【改善A】2段階ハイブリッド生成（Kling 3.0 ➔ Sync v3 口パク）`** を新搭載。
   - **第1段階**：最新の `fal-ai/kling-video/v3/pro/image-to-video` で写真と演出プロンプトから「映画のようなカメラワークと全身の演技動画（3〜15秒）」を生成し、「喋る証明写真」問題を解消。
   - **第2段階**：生成されたKling動画に対して、`fal-ai/sync-lipsync/v3`（または選択により `fal-ai/kling-video/lipsync/audio-to-video`）を自動実行し、カメラワークと全身の動きを保ったまま口元だけを歌声に同期。
3. **MiniMax H3 の仕様明記と全AIモデル演出プロンプト刷新（v13.1〜継続）**:
   - `minimax/h3-max/lip-sync/image-to-video` 選択時はプロンプト非対応の注意バナーを自動表示。
   - 3つの演出プロンプトは具体的なカメラワーク＋身振り手振り＋顔の演技指示に刷新済み。

## 3. 現在のファイル構成 (`/home/agent/workspace`)
- `index.html`: v14.0 本格AIリップシンク歌唱動画生成スタジオ画面（改善B・改善A搭載）
- `app.js`: v14.0 Demucsボーカル分離、Kling 3.0 Pro ➔ Sync v3 2段階ハイブリッド生成、FFmpeg原曲再合成パイプライン
- `style.css`: 2段固定タイムディスプレイ、単一選択ハイライト、特大ボタン・高コントラストUIスタイル
- `audio-engine.js`: 楽曲読み込み・再生（大容量ファイル対応・小数精度トリミング対応）
- `audio-cutter.js` / `audio-cutter.html`: 楽曲カッター専用ツール
- `v11-b.html`: `index.html` への自動リダイレクト専用ファイル
