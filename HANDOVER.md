# GrooveSync MV Studio — AI開発引き継ぎドキュメント (HANDOVER.md)

## 1. プロジェクトの目的・ユーザー環境・最優先ルール

### 1.1 プロジェクトの目的
- **概要**: ユーザー様が制作されたオリジナルボーカル楽曲（MP3/WAV/M4A等）と、用意されたキャラクター／人物の写真（または動画）を組み合わせて、**スマートフォン（iPhone）だけで完結できる本格AIリップシンクMV（歌唱動画）制作Webアプリ**を構築する。
- **最重要品質要件（「顔・画風の100%現状維持」）**:
  - **「アップロードした写真のキャラクターの顔・目鼻立ち・輪郭・画風（スタイル）を100%そのまま維持し、別人の顔に作り変えたり、顔を崩したりしないこと」** が絶対条件。
  - AIが写真を参考に新しい顔を創作（再生成）して「別人の顔」になることや、大音量時に口や目が歪んで「妖怪・悪魔のような顔」になることはNG（クレーム対象）。
  - 「顔が崩れる・別人に変わるモデル（旧2段階ハイブリッド等）」は選択肢に残さず排除すること。

### 1.2 ユーザー様の操作環境とUX・対応上の絶対ルール
1. **iPhone操作 ＆ 視力への配慮（バリアフリー特大UI）**:
   - ユーザー様は **iPhone** から操作されており、**視力への配慮（特大文字・高コントラスト配色・指で押しやすい特大ボタン・画面いっぱいのスクロールしやすい単一カラムUI）** が必須。
   - 小さな文字、細かすぎるボタン、複雑な階層メニュー、複数同時に選択されているように見える紛らわしいハイライトは厳禁。
2. **音声入力（ディクテーション）への配慮**:
   - iPhoneの音声入力でチャットされることがあるため、同音異義語や音声認識特有の誤変換があっても文脈から正確に意図を汲み取って対応すること。
3. **開発・検証姿勢に関する重要ルール**:
   - **「1回ごとにユーザー様に実験・確認させるのではなく、開発側（AI側）でAPI仕様・パラメータ・挙動・イベント干渉バグを徹底的に確認・検証し、確実に動作する完成状態で報告すること」**。

---

## 2. ファイル構成 (`/home/agent/workspace`)

| ファイル名 | 行数 / サイズ | 役割・概要 |
| :--- | :--- | :--- |
| `index.html` | 1,109行 (~83KB) | メイン画面（v16.1）。STEP 0（Fal.ai APIキー登録）〜 STEP 4（完成サイズ選択・ボーカル分離・顔固定ロック・AIモデル選択・生成・保存モーダル）の特大UI |
| `app.js` | 4,240行 (~183KB) | メイン制御ロジック。5重APIキー永続化、写真/動画2モード制御、0.5秒単位トリマー、MP3/WAV直接エンコード、Fal.ai APIパイプライン（Demucs分離・ソフトリミッター・FFmpeg固定ビデオ化・V2V口唇同期・原曲マージ） |
| `style.css` | 2,773行 (~56KB) | iPhone向け高コントラスト・特大ボタンUIスタイル、「文字を特大にする」ズーム機能、単一選択ハイライト制御 |
| `audio-engine.js` | 944行 (~31KB) | Web Audio APIベースの楽曲デコード・再生エンジン。大容量ファイル対応、0.5秒精度の区間再生・シーク・リアルタイム周波数/音量解析 |
| `character-renderer.js` | 616行 (~20KB) | Canvas描画・カスタムアバター写真保持・ステージプレビュー管理クラス |
| `presets.js` | 263行 (~9KB) | プリセット設定データ定義 |
| `audio-cutter.html` | 643行 (~30KB) | 楽曲切り出し（サビカッター）専用サブページ |
| `audio-cutter.js` | 1,250行 (~45KB) | 楽曲カッター専用ページの制御スクリプト |
| `lame.min.js` | 307行 (~156KB) | ブラウザ内MP3エンコード用ライブラリ（lamejs） |
| `v11-b.html` | 55行 (~1.7KB) | 旧ブックマーク・キャッシュ対策用の `index.html` への即時リダイレクトページ |
| `HANDOVER.md` | 本ファイル | 別のAIへの開発引き継ぎ用統合ドキュメント |

---

## 3. 実装済み機能一覧（現在 v16.1）

### 3.1 STEP 0: Fal.ai APIキーの5重永続化システム（iOS Safari / PWA対応）
- iPhoneのSafari通常タブと「ホーム画面に追加（PWA）」の間でストレージが分離・消去される問題に対処するため、以下の**5層バックアップ記憶**を実装済み：
  1. `localStorage` (`fal_api_key` 等)
  2. `sessionStorage`
  3. `document.cookie` (`gs_fal_api_key`, max-age 10年)
  4. `CacheStorage` (`gs-key-vault-v1`)
  5. `IndexedDB` (`GrooveSyncVaultDB`) ＋ URL Hash (`#gs_key=...`)
- ワンタップ貼り付け＆保存ボタン、キー文字列（`xxxx:yyyy`形式）ペースト時の即時自動保存を実装。

### 3.2 STEP 1: 歌わせたい人物素材の取り込み（写真モード ＆ 動画モード）
- **① 写真・画像から（デフォルト）**:
  - JPG / PNG / WebP に加え、iPhone標準の **HEIC / HEIF** 写真も `heic2any` ＋フォールバックデコーダで自動変換して読み込み。
- **② 動画から（MP4 / MOV）**:
  - **パターン①（動画のまま口元だけリップシンク）**: 元動画のカメラワークや全身の動きを維持したまま口元を歌声にアテレコ（V2V）。
  - **パターン②（動画から好きな1コマを切り出して歌唱）**: 動画プレビューの任意の位置で静止画キャプチャし、写真モード同様に歌わせる。

### 3.3 STEP 2 & STEP 3: 楽曲読み込み ＆ 0.5秒単位の高精度サビ切り出し・単体保存
- MP3 / WAV / M4A / AAC / MP4動画音声などの読み込みに対応。
- **曲全体プレビュー＆ワンタップ区間セット**:
  - 曲を聴きながら「📍 いまの秒数を開始位置にセット」「🏁 いまの秒数を終了位置にセット」で直感的に区間指定可能。
- **開始位置・終了位置・長さの独立微調整**:
  - 分・秒の直接数値入力、および `±0.5秒` / `±1秒` ステッパーボタンを完備（開始位置を動かしても終了位置が勝手にズレない独立計算）。
- **カット音声単体の即時保存（MP3 / WAV）**:
  - 動画を生成せず、切り出したサビ音源単体を **MP3（192kbps）** または **WAV（無劣化PCM）** でiPhoneの「ファイル」アプリ等に直接保存・共有可能。

### 3.4 STEP 4: 完成動画サイズ・ボーカル分離・顔100%固定ロック・AI生成パイプライン
1. **📐 ① 完成動画のサイズ（画面比率・解像度）選択**:
   - `縦型 9:16` / `横型 16:9` / `正方形 1:1` / `元素材のまま` の4種。
   - 縦横比が異なる場合の収め方：`画面いっぱいに拡大（cover）` / `写真全体を入れる（contain_blur：背景ぼかし余白）`。
   - 解像度：`標準 HD (720p)` / `フルHD (1080p)`。リアルタイムの構図確認ミニプレビューCanvas付き。
2. **🎙️ ②【改善B】AIボーカル自動分離（`fal-ai/demucs`）**:
   - ドラムやギター等の伴奏音に反応して口がパクパク誤作動するのを防ぐため、まず `fal-ai/demucs` で「ボーカル声のみ」を抽出。
   - 口パク映像生成後、`fal-ai/ffmpeg-api/merge-audio-video` で**元の伴奏入り100%高音質音源を完成動画に自動再合成**。
3. **🔒 ②-2 「別人化ゼロ」元写真100%顔固定・口唇限定ロック（`enableIdentityLock`）**:
   - **無劣化PNG送信**: JPEG圧縮ノイズによる目・口元の劣化を防止。
   - **ガイド音声のソフトリミッター減衰（`buildGentleLipsyncBuffer`）**: マスタリング済みの大音量ボーカル（0 dBFS）をそのままAIに渡すと「絶叫している」と判定されて顎が2倍に裂けるため、口パク計算用ガイド音声のみを `tanh` ソフトリミッターで会話レベル（ピーク `0.22` ≒ `-13 dBFS`）に自動減衰。
4. **③ 使用するAIモデル（v16.1: Photo-Lock V2V 口唇限定方式）**:
   - **手順1**: アップされた写真を `fal-ai/ffmpeg-api/compose` で無劣化のまま指定秒数の固定MP4ビデオに変換（AIによる顔全体の再生成を物理的に遮断）。
   - **手順2**: 固定ビデオに対して Video-to-Video 口元専用モデルを適用：
     - **① `Sync-3 Video Lips-Only` (`fal-ai/sync-lipsync/v3`, `model_mode: "lips"`)【デフォルト】**
     - **② `Sync React-1 Lips-Only` (`fal-ai/sync-lipsync/react-1`, `model_mode: "lips"`)**
     - **③ `Kling LipSync V2V ／ LatentSync` (`fal-ai/kling-video/lipsync/audio-to-video` / `fal-ai/latentsync`)**
     - **④ `HeyGen v3 Precision ／ VEED v2` (`fal-ai/heygen/v3/lipsync/precision` / `veed/lipsync/v2`)**
5. **完成動画のインライン再生＆iPhoneカメラロール保存**:
   - 生成完了後、MP4 Blobをバックグラウンド取得し、Web Share API（`navigator.share({ files: [mp4File] })`）経由でiPhoneの「ビデオを保存（カメラロール）」へ1タップ保存可能。

---

## 4. 未解決の課題・引き継ぎ最重要事項（次のAIが取り組むべきポイント）

### 課題1：【最優先】「元写真のキャラクターの顔・画風を100%維持したリップシンク」の実機検証とさらなる精度向上
- **これまでの経緯と失敗パターン**:
  1. **Image-to-Video 全身生成モデル（`OmniHuman v1.5 / v2.0`, `Kling Avatar v2`, `Kling 3.0 / 4.0`, `Mirage Avatar X` 等）の問題**:
     - これらは「入力写真を参考にして、AIが動画全フレームの顔をゼロから描き直す（拡散モデルで再生成する）」仕組みであるため、**元の写真のキャラクターではなく、AIが新しく創作した「別人の顔」になってしまう**（さらに音量が大きいと「妖怪・悪魔のような顔」に崩れる）。
     - ユーザー様より「化け物までは酷くないが別人になる。これでは使えばクレームの嵐」「顔崩れてほしいと思う人はいない。顔が変わるハイブリッド等は不要」と明確にご指摘あり。
  2. **v16.0〜v16.1 で導入した「Photo-Lock V2V（静止画の無劣化固定ビデオ化 ➔ `model_mode: "lips"`）」の現状と残課題**:
     - AIに目・鼻・輪郭を作らせないため、写真を一度 `fal-ai/ffmpeg-api/compose` で固定MP4動画にし、`fal-ai/sync-lipsync/v3` や `react-1` の `model_mode: "lips"`（くちびるのみ編集）に渡す構造に改修した直後の状態（v16.1）。
     - **懸念点・検証が必要な点**:
       - `fal-ai/sync-lipsync/v3` のパラメータ構造（トップレベルの `model_mode: "lips"` か `options: { model_mode: "lips" }` か）がFal.aiエンドポイント仕様で確実に効いているかの実API検証。
       - 実写ではなく**アニメ・イラスト・2Dキャラクター画像**を入力した場合、Sync-3 や LatentSync 等のV2Vリップシンクモデルは「実写の人間の口・歯・唇テクスチャ」で口元をインペイント（塗り直し）するため、**口元だけ実写風になって浮く／違和感が出る、あるいは顔検出（Face Detection）が2Dイラストで失敗するケース**がある。
       - もしFal.aiのV2Vモデルでも口元の画風が変わる場合、**クライアント側Canvas（2Dワープ／口パーツの自然な開閉モーフィング＋元画像のピクセル100%保持）とのハイブリッドや、口元ブレンディングマスクの制御**など、**「100%確実に元写真の顔・画風が1ミリも別人に変わらない方式」** を開発側でテスト・確認した上で提示する必要がある。

### 課題2：コード内の旧モード残骸の整理（クリーンアップ）
- `index.html` からは顔が変わる旧モデル（OmniHuman / Klingハイブリッド等）のボタンと演出プロンプト欄を削除済み（v16.1）だが、`app.js` 側には旧 `hybrid_lipsync` モードやプロンプト処理の分岐コード（約2579〜2844行付近）がフォールバックとして残っているため、整理するとメンテナンス性が向上する。

### 課題3：ユーザー様への報告前の自己検証徹底
- コード変更後、UIボタンのクラス名干渉（過去に `.video-res-btn` クラスを別ボタンに流用して無関係なトーストが出たバグあり ➔ 修正済み）や、バージョン表記（ヘッダーの `#headerVersionLabel` とキャッシュクエリ `?v=...`）の不一致がないか、必ず開発側で確認してから案内すること。

---

## 5. 主要ファイルのコード全文

### 5.1 `index.html`

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <meta name="apple-mobile-web-app-title" content="GrooveSync MV">
  <meta name="theme-color" content="#090d16">
  <title>GrooveSync MV Studio - 本格AIリップシンク歌唱動画生成スタジオ (v16.1)</title>
  <link rel="stylesheet" href="style.css?v=20261025_161">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700;900&display=swap" rel="stylesheet">
</head>
<body>
  <div id="app" class="app-root">

    <!-- Top Header Bar -->
    <header class="top-mode-header">
      <div style="display: none !important;" aria-hidden="true">
        <button id="tabBtnControls" type="button"><strong id="tabControlsTitle"></strong><span id="tabControlsSub"></span></button>
        <button id="tabBtnStage" type="button"><strong id="tabStageTitle"></strong><span id="tabStageSub"></span></button>
      </div>

      <!-- ユーティリティバー（文字拡大 ＆ 音声カッター直通 ＆ バージョン更新ボタン） -->
      <div class="header-accessibility-bar">
        <button id="zoomToggleBtn" class="zoom-toggle-btn" aria-label="文字とボタンを特大サイズに拡大します">
          <span class="zoom-icon">🔍</span>
          <span id="zoomBtnText">文字を特大にする</span>
          <span id="zoomStatusBadge" class="zoom-status-badge">標準</span>
        </button>

        <a href="audio-cutter.html" class="app-reload-btn" style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(236, 72, 153, 0.25)); border-color: #a855f7; color: #fff; text-decoration: none;" title="楽曲切り出し専用ツールを開く">
          <span>✂️</span>
          <span>楽曲カッター</span>
        </a>

        <button id="appReloadBtn" class="app-reload-btn" aria-label="アプリを最新状態に更新・リロードします" title="最新バージョンを再読み込み">
          <span class="reload-icon">🔄</span>
          <span id="headerVersionLabel">最新版 (v16.1)</span>
        </button>
      </div>
    </header>

    <!-- =============================================================== -->
    <!-- VIEW 1: 操作画面 (iPhone全画面で大きく見やすいコントロール) -->
    <!-- =============================================================== -->
    <main id="viewControls" class="main-view active-view">

      <!-- Step-by-Step Arrow Flow Guide Banner (矢印フロー解説) -->
      <section class="flow-guide-card">
        <span class="flow-badge" id="flowGuideBadge">🎤 本格AIリップシンクMV制作スタジオ (v16.0: 「顔生成ゼロ・元写真100%固定 ➔ 口唇のみV2V同期」搭載)</span>
        <div class="flow-steps-row">
          <span class="flow-chip highlight">🔑 APIキー登録</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-chip" id="flowStep1Chip">① 写真 or 動画をセット</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-chip">② 曲と秒数を指定</span>
          <span class="flow-arrow">➔</span>
          <span class="flow-chip rec">③ 完成サイズ選択＆AI生成</span>
        </div>
      </section>

      <!-- ==========================================
           🔑 STEP 0: Fal.ai 統合APIキーの取得方法 ＆ 登録パネル
           ========================================== -->
      <section class="large-section" style="border: 2.5px solid rgba(192, 132, 252, 0.8); background: linear-gradient(145deg, rgba(30, 27, 75, 0.95), rgba(15, 23, 42, 0.98));">
        <div class="section-title-wrap">
          <span class="step-badge highlight-badge">🔑</span>
          <div>
            <h3 class="section-title">最初に1回だけ：Fal.ai APIキーの取得・登録</h3>
            <p class="section-sub">ホーム画面に追加したアプリでも消えない「5重バックアップ記憶」対応！1回保存すれば次回から自動復元されます</p>
          </div>
        </div>

        <!-- 現在のキー登録状態 -->
        <div style="background: rgba(15, 23, 42, 0.95); border: 2px solid rgba(192, 132, 252, 0.5); border-radius: 14px; padding: 16px; margin-bottom: 16px;">
          <div style="font-size: 1.05rem; color: #f8fafc; margin-bottom: 12px; line-height: 1.5;">
            <strong>現在のAPIキー状態：</strong><br>
            <span id="statusKeyFal" style="display: inline-block; background: rgba(255,255,255,0.12); padding: 8px 14px; border-radius: 10px; font-size: 1rem; font-weight: 900; margin-top: 6px; color: #fde047; word-break: break-word;">⚠️ 未登録（下の案内からキーを取得して貼り付けてください）</span>
          </div>

          <!-- 直接入力＆保存フォーム（ホーム画面アプリでも消えない5重保存＋ワンタップ貼り付け） -->
          <label for="inlineFalApiKeyInput" style="display: block; font-size: 0.98rem; font-weight: 800; color: #f0abfc; margin-bottom: 8px;">
            👇 取得した Fal.ai APIキーをここに貼り付けて保存（ホーム画面アプリにも自動記憶）：
          </label>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; gap: 8px; align-items: stretch; width: 100%;">
              <input type="password" id="inlineFalApiKeyInput" name="fal_api_key" autocomplete="on" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="例: 12345678-abcd-efgh:xxxxxxxx" style="flex: 1; min-width: 0; box-sizing: border-box; background: #090d16; border: 2px solid #c084fc; border-radius: 12px; padding: 15px 12px; color: #fff; font-size: 1.02rem; font-weight: 700; font-family: ui-monospace, SFMono-Regular, monospace;">
              <button id="toggleKeyVisibilityBtn" type="button" style="background: #1e293b; border: 2px solid rgba(192, 132, 252, 0.6); border-radius: 12px; padding: 0 14px; color: #e2e8f0; font-size: 0.95rem; font-weight: 800; cursor: pointer; flex-shrink: 0; white-space: nowrap;" title="キーの表示・非表示を切り替え">
                <span>👁 表示</span>
              </button>
            </div>

            <button id="pasteAndSaveApiKeyBtn" type="button" class="giant-btn" style="width: 100%; background: linear-gradient(135deg, #0284c7, #2563eb); border: 2px solid #7dd3fc; border-radius: 12px; padding: 15px 12px; font-size: 1.05rem; font-weight: 900; color: #fff; cursor: pointer;">
              <span>📋 コピーしたAPIキーを1タップで貼り付け＆保存</span>
            </button>

            <button id="saveInlineApiKeyBtn" type="button" class="giant-btn" style="width: 100%; background: linear-gradient(135deg, #a855f7, #ec4899); border: 2px solid #f0abfc; border-radius: 12px; padding: 16px 12px; font-size: 1.08rem; font-weight: 900; color: #fff; cursor: pointer;">
              <span>✔ APIキーをiPhone＆ホーム画面用に永久記憶する</span>
            </button>
          </div>

          <div style="margin-top: 12px; background: rgba(56, 189, 248, 0.12); border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 10px; padding: 10px 12px; font-size: 0.9rem; color: #e0f2fe; line-height: 1.5;">
            💡 <strong>ホーム画面に追加する時のコツ：</strong><br>
            ① この画面でAPIキーを保存してからSafariの<strong>「ホーム画面に追加」</strong>を押すと、ホーム画面アイコンにもキーが自動で引き継がれます。<br>
            ② すでにホーム画面に追加済みの場合は、ホーム画面アプリを開いて一度だけキーを保存すれば、アプリ内に<strong>5重バックアップ記憶</strong>され消えなくなります！
          </div>
        </div>

        <!-- どこからAPIキーを取ればいいか（わかりやすい3ステップ解説＋直通リンク） -->
        <div style="background: rgba(15, 23, 42, 0.9); border: 2px solid rgba(56, 189, 248, 0.55); border-radius: 16px; padding: 18px;">
          <h4 style="color: #7dd3fc; font-size: 1.18rem; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">
            <span>📖</span>
            <span>APIキーはどこから取る？（iPhoneで3分・かんたん手順）</span>
          </h4>

          <div style="display: flex; flex-direction: column; gap: 14px; font-size: 1rem; color: #f1f5f9; line-height: 1.6;">
            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 14px; border-left: 4px solid #38bdf8;">
              <strong style="color: #38bdf8; font-size: 1.05rem; display: block; margin-bottom: 4px;">手順①：Fal.ai にログインする</strong>
              下の青いボタンを押して <strong>Fal.ai 公式ページ</strong> を開き、<strong>Googleアカウント</strong>（またはGitHub / メール）でログインします。
              <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; text-decoration: none; padding: 14px; border-radius: 12px; font-weight: 900; font-size: 1.05rem; border: 2px solid #7dd3fc;">
                <span>🌐 1. Fal.ai キー発行ページを開く ↗</span>
              </a>
            </div>

            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 14px; border-left: 4px solid #10b981;">
              <strong style="color: #6ee7b7; font-size: 1.05rem; display: block; margin-bottom: 4px;">手順②：クレジット（残高）を少しチャージする</strong>
              月額固定費ではなく、<strong>使った分だけ減るプリペイド式</strong>です。Billing（支払い設定）ページでクレジットカード等を登録し、まずは <strong>$5〜$10（約750円〜1,500円）</strong> ほどチャージします。
              <a href="https://fal.ai/dashboard/billing" target="_blank" rel="noopener" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; background: rgba(16, 185, 129, 0.25); color: #6ee7b7; text-decoration: none; padding: 13px; border-radius: 12px; font-weight: 900; font-size: 1rem; border: 2px solid #10b981;">
                <span>💳 2. Fal.ai チャージ（Billing）ページを開く ↗</span>
              </a>
            </div>

            <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 14px; border-left: 4px solid #c084fc;">
              <strong style="color: #f0abfc; font-size: 1.05rem; display: block; margin-bottom: 4px;">手順③：「+ Add key」を押してキーをコピー＆貼り付け</strong>
              キー発行ページ（Keys）で <strong>「+ Add key」</strong>（または Create Key）を押し、出てきた英数字のキーを<strong>「Copy（コピー）」</strong>します。<br>
              あとはこの画面の上の入力欄に貼り付けて<strong>「✔ APIキーをiPhoneに記憶・保存する」</strong>を押せば完了です！
            </div>
          </div>
        </div>
      </section>

      <!-- ==========================================
           STEP 1: 歌わせたい人物の素材（写真 または 動画）を取り込む
           ========================================== -->
      <section class="large-section" id="sectionStep1">
        <div class="section-title-wrap">
          <span class="step-badge highlight-badge">1</span>
          <div>
            <h3 class="section-title">歌わせたい人物の素材を取り込む</h3>
            <p class="section-sub">「① 写真・画像からリップシンク（従来通り）」と「② 動画からリップシンク（2パターン選択）」の両方に対応しています</p>
          </div>
        </div>

        <!-- 素材切り替えタブ（特大ボタンスタイル） -->
        <div class="material-mode-tabs" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
          <button type="button" id="tabModePhoto" class="mat-tab-btn active">
            <span style="font-size: 1.8rem; flex-shrink: 0;">📷</span>
            <div style="line-height: 1.25;">
              <strong style="font-size: 1.05rem; display: block;">① 写真・画像から</strong>
              <small style="font-size: 0.78rem; color: #cbd5e1;">（これまでのリップシンク）</small>
            </div>
          </button>

          <button type="button" id="tabModeVideo" class="mat-tab-btn">
            <span style="font-size: 1.8rem; flex-shrink: 0;">🎬</span>
            <div style="line-height: 1.25;">
              <strong style="font-size: 1.05rem; display: block;">② 動画から</strong>
              <small style="font-size: 0.78rem; color: #94a3b8;">（2つのパターンを選択）</small>
            </div>
          </button>
        </div>

        <!-- =====================================
             【モード①】写真・画像から作る（これまでのUI・機能を100%完全維持）
             ===================================== -->
        <div id="materialPhotoBox">
          <!-- Big Photo Upload Button -->
          <label for="avatarFileInput" class="giant-action-card photo-upload-card" id="avatarUploadBtn" role="button" tabindex="0" aria-label="あなたが用意した人物の写真をアップロード">
            <div class="avatar-preview-wrap" id="avatarPreviewWrap">
              <span class="action-card-icon" id="avatarCardIcon">📷</span>
              <img id="avatarPreviewImg" class="avatar-preview-img hidden" alt="アップロードした写真">
            </div>
            <div class="action-card-text">
              <strong id="avatarCardTitle">あなたが用意した人物の写真をアップロード</strong>
              <span id="avatarCardHint">ここをタップしてiPhoneの写真ライブラリから選択（JPG, PNG, HEIC対応）</span>
            </div>
          </label>
          <input type="file" id="avatarFileInput" accept="image/*" class="sr-only-input">

          <!-- Custom Avatar Success Banner -->
          <div id="customAvatarBanner" class="custom-avatar-banner hidden" style="margin-top: 14px;">
            <div class="custom-avatar-banner-head">
              <span class="custom-avatar-check-badge">✔</span>
              <div class="custom-avatar-banner-text">
                <strong id="customAvatarStatusTitle">あなたの写真がセットされました！</strong>
                <span id="customAvatarStatusSub">続けてSTEP 2で楽曲を取り込み、歌わせる区間を決めてください</span>
              </div>
            </div>
            <div class="custom-avatar-btn-row" style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
              <button id="changeAvatarBtn" class="avatar-action-btn secondary-btn" type="button" style="flex: 1; min-width: 160px; padding: 14px; font-size: 1rem;">
                <span>🔄 別の写真に変更する</span>
              </button>
            </div>
          </div>
        </div>

        <!-- =====================================
             【モード②】動画素材から作る（新設：2つのパターン選択）
             ===================================== -->
        <div id="materialVideoBox" class="hidden">
          <!-- Big Video Upload Button -->
          <label for="videoMaterialFileInput" class="giant-action-card photo-upload-card" id="videoMaterialUploadBtn" role="button" tabindex="0" aria-label="あなたが撮影・用意した人物動画をアップロード" style="border-color: #38bdf8;">
            <div class="avatar-preview-wrap" id="videoMaterialPreviewWrap">
              <span class="action-card-icon" id="videoMaterialCardIcon">🎬</span>
              <video id="videoMaterialThumb" class="avatar-preview-img hidden" muted playsinline></video>
            </div>
            <div class="action-card-text">
              <strong id="videoMaterialCardTitle">あなたが撮影・用意した人物動画をアップロード</strong>
              <span id="videoMaterialCardHint">ここをタップしてiPhoneの写真・ビデオから選択（MP4, MOV対応）</span>
            </div>
          </label>
          <input type="file" id="videoMaterialFileInput" accept="video/*,.mp4,.mov,.m4v,.webm" class="sr-only-input">

          <!-- Video Loaded & Pattern Selection Box -->
          <div id="videoPatternSection" class="hidden" style="margin-top: 16px;">
            <!-- Video Player Preview with Time & Seek -->
            <div style="background: rgba(15, 23, 42, 0.95); border: 2px solid rgba(56, 189, 248, 0.55); border-radius: 16px; padding: 14px; margin-bottom: 16px;">
              <div style="font-size: 1rem; font-weight: 800; color: #7dd3fc; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span>🎥 読み込んだ元動画プレビュー:</span>
                <span id="sourceVideoDurationLabel" style="font-size: 0.9rem; color: #fde047; font-weight: 800;">再生時間: --:--</span>
              </div>
              <video id="sourceVideoPlayer" controls playsinline style="width: 100%; max-height: 280px; border-radius: 12px; background: #000; outline: none;"></video>
            </div>

            <!-- Two Pattern Selection Buttons -->
            <div style="font-size: 1.05rem; font-weight: 900; color: #fbcfe8; margin-bottom: 10px;">
              👇 動画からの作り方（2つのパターンからタップして選択）：
            </div>

            <div class="video-pattern-grid" style="display: grid; grid-template-columns: 1fr; gap: 12px;">
              <!-- Pattern A (パターン①): Video-to-Video LipSync -->
              <button type="button" class="video-pattern-btn active" id="patternBtnA">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px; flex-wrap: wrap;">
                  <strong style="font-size: 1.12rem; color: #f0abfc;">🎥 パターン①：動画のまま口元だけリップシンク</strong>
                  <span class="pattern-pill" id="patternPillA">✔ 選択中</span>
                </div>
                <p style="font-size: 0.93rem; color: #f1f5f9; margin: 0; line-height: 1.45;">
                  元動画の全身の動き・カメラワーク・背景を100%そのまま活かし、<strong>口の動きだけを切り出した楽曲に合わせて歌声に同期（アテレコ）</strong>させます。
                </p>
                <div style="margin-top: 8px; font-size: 0.84rem; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 8px;">
                  ⚡ 使用AI: Sync Lipsync v3 / LatentSync（動画専用リップシンク）
                </div>
              </button>

              <!-- Pattern B (パターン②): Frame Extract to Singing Video -->
              <button type="button" class="video-pattern-btn" id="patternBtnB">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px; flex-wrap: wrap;">
                  <strong style="font-size: 1.12rem; color: #7dd3fc;">📸 パターン②：動画から好きな1コマを切り出して歌唱</strong>
                  <span class="pattern-pill" id="patternPillB">タップで選択</span>
                </div>
                <p style="font-size: 0.93rem; color: #cbd5e1; margin: 0; line-height: 1.45;">
                  動画の中からお気に入りの瞬間を<strong>写真（静止画）として切り出し</strong>、その顔のままで<strong>くちびる（口唇）だけを動かして歌わせます</strong>。
                </p>
                <div style="margin-top: 8px; font-size: 0.84rem; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 6px 10px; border-radius: 8px;">
                  🔒 使用AI: Sync-3 Video Lips-Only / React-1 Lips-Only（顔100%固定）
                </div>
              </button>
            </div>

            <!-- Frame capture controller (shown when Pattern B is selected) -->
            <div id="patternBFrameBox" class="hidden" style="margin-top: 14px; background: rgba(2, 132, 199, 0.15); border: 2px solid #38bdf8; border-radius: 14px; padding: 14px;">
              <div style="font-size: 0.98rem; font-weight: 800; color: #7dd3fc; margin-bottom: 8px;">
                📸 写真として切り出すタイミングの指定：
              </div>
              <p style="font-size: 0.88rem; color: #e0f2fe; margin: 0 0 10px 0; line-height: 1.4;">
                上のプレビュー動画を再生し、歌わせたいベストな表情のところで一時停止して下のボタンを押してください（動画読み込み時に最初の1コマが自動セットされています）。
              </p>
              <button type="button" id="captureVideoFrameBtn" class="giant-btn" style="width: 100%; background: linear-gradient(135deg, #0284c7, #2563eb); border: 2px solid #7dd3fc; border-radius: 12px; padding: 14px; font-size: 1.05rem; font-weight: 900; color: #fff; cursor: pointer;">
                <span>📸 現在の再生位置の1コマを写真としてセットする</span>
              </button>
              <div id="capturedFramePreviewRow" class="captured-frame-preview-row hidden">
                <img id="capturedFrameThumb" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 2px solid #38bdf8;" alt="切り出した1コマ">
                <div>
                  <strong style="color: #6ee7b7; font-size: 0.95rem; display: block;">✔ 1コマを写真としてセット完了！</strong>
                  <span id="capturedFrameTimeBadge" style="font-size: 0.84rem; color: #cbd5e1;">切り出し位置: 00:00</span>
                </div>
              </div>
            </div>

            <div style="margin-top: 14px; display: flex; gap: 10px;">
              <button id="changeVideoMaterialBtn" class="avatar-action-btn secondary-btn" type="button" style="flex: 1; padding: 14px; font-size: 1rem;">
                <span>🔄 別の動画に変更する</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ==========================================
           STEP 2: 楽曲を取り込む
           ========================================== -->
      <section class="large-section">
        <div class="section-title-wrap">
          <span class="step-badge highlight-badge">2</span>
          <div>
            <h3 class="section-title">あなたのオリジナル楽曲を取り込む</h3>
            <p class="section-sub">リップシンクの元になるボーカル楽曲ファイルをアップロードします</p>
          </div>
        </div>

        <!-- Big Audio File Upload Button -->
        <label for="audioFileInput" class="giant-action-card audio-upload-card" id="audioUploadBtn" role="button" tabindex="0" aria-label="あなたが制作した楽曲ファイルをアップロード">
          <span class="action-card-icon">📁</span>
          <div class="action-card-text">
            <strong id="audioCardTitle">あなたが制作した楽曲ファイルをアップロード</strong>
            <span id="audioUploadHint">MP3, WAV, AAC, M4A（スマホ録音・動画の音声もOK）に対応（ここをタップ）</span>
            <small style="display:block;margin-top:6px;font-size:12px;color:#94a3b8;font-weight:normal;line-height:1.4;">💡 Googleドライブの曲が開きにくい時は「このiPhone内」に保存しておくと一瞬で読み込めます</small>
          </div>
        </label>
        <input type="file" id="audioFileInput" accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.mp4,.mov,.m4v,.webm,.caf,.aif" class="sr-only-input" tabindex="-1">
      </section>

      <!-- ==========================================
           STEP 3: リップシンクさせる区間（秒数）を調整する
           ========================================== -->
      <section class="large-section" id="sectionTrimmer">
        <div class="section-title-wrap">
          <span class="step-badge highlight-badge">3</span>
          <div>
            <h3 class="section-title">歌わせる区間（サビ・秒数）を決める</h3>
            <p class="section-sub">ここで指定した区間の音声が自動で切り出され、AIリップシンク動画の歌声になります</p>
          </div>
        </div>

        <div class="trimmer-card">
          <!-- 曲全体プレビュー＆リアルタイム秒数モニター -->
          <div class="song-full-preview-box">
            <div class="preview-box-header">
              <span class="preview-box-tag">🎵 楽曲全体の秒数チェック＆サビ探し</span>
              <span class="preview-box-hint">曲を流して歌わせたい箇所の秒数を確認できます</span>
            </div>

            <!-- 大型リアルタイム秒数ディスプレイ（上段：ラベル＆再生状態バッジ ／ 下段：特大秒数カウンター） -->
            <div class="current-time-large-display">
              <div class="time-display-top-row">
                <span class="time-label">⏱ 現在の再生位置:</span>
                <div id="fullPlayerStatusBadge" class="player-status-badge">待機中</div>
              </div>
              <div class="time-readout-wrap">
                <span id="fullPlayerCurrentTime" class="time-counter-big">00:00</span>
                <span class="time-slash">/</span>
                <span id="fullPlayerTotalTime" class="time-counter-total">00:00</span>
              </div>
            </div>

            <!-- 曲全体のタイムライン・シークバー＆切り取り範囲の可視化バー -->
            <div class="timeline-visual-container">
              <div class="timeline-track" id="timelineTrack">
                <div class="timeline-selection-range" id="timelineSelectionRange">
                  <span class="selection-range-label">リップシンク区間</span>
                </div>
                <div class="timeline-playhead" id="timelinePlayhead"></div>
              </div>
              <input type="range" id="fullSongSeekSlider" class="timeline-seek-slider" min="0" max="30" value="0" step="0.5" aria-label="曲全体の再生位置をシーク">
              <div class="timeline-labels">
                <span>00:00 (曲の始まり)</span>
                <span id="timelineMidLabel">--:--</span>
                <span id="timelineEndLabel">--:-- (曲の終わり)</span>
              </div>
            </div>

            <!-- 再生操作＆「サビ頭出し」ボタン群 -->
            <div class="full-player-controls-row">
              <button id="fullPlayToggleBtn" class="giant-btn giant-play-inline-btn" type="button">
                <span id="fullPlayIcon">▶</span>
                <span id="fullPlayLabel">曲全体を再生して秒数を確認</span>
              </button>

              <button id="fullPlayRewindBtn" class="btn-sub-action" type="button" title="曲の最初に戻る">
                <span>⏮ 最初から (00:00)</span>
              </button>

              <div class="set-endpoints-grid">
                <button id="setStartFromCurrentBtn" class="btn-start-sync-action" type="button">
                  <span class="btn-icon">📍</span>
                  <span>いまの秒数を開始位置にセット</span>
                </button>

                <button id="setEndFromCurrentBtn" class="btn-end-sync-action" type="button">
                  <span class="btn-icon">🏁</span>
                  <span>いまの秒数を終了位置にセット</span>
                </button>
              </div>
            </div>
            <div class="preview-helper-text">
              💡 <strong>曲を聴きながらワンタップで位置決定：</strong><br>
              歌わせたい歌い出しで「📍 開始位置にセット」を押し、歌い終わりで「🏁 終了位置にセット」を押すだけで、一発で区間が決まります！
            </div>
          </div>

          <!-- 区間設定ステータス（開始位置・終了位置・動画の長さ） -->
          <div class="trimmer-status-box" style="margin-top: 20px;">
            <div class="trim-stat">
              <span class="stat-label">歌い出し位置:</span>
              <strong id="trimStartReadout" class="stat-val">00:00</strong>
            </div>
            <div class="trim-arrow">〜</div>
            <div class="trim-stat">
              <span class="stat-label">終了位置:</span>
              <strong id="trimEndReadout" class="stat-val">00:15</strong>
            </div>
            <div class="trim-stat total">
              <span class="stat-label">生成する動画の長さ:</span>
              <strong id="trimDurationReadout" class="stat-val highlight">15秒間</strong>
            </div>
          </div>

          <!-- ① 開始位置の分・秒 直接入力 ＆ 0.5秒/1秒ずらし微調整 -->
          <div class="trim-direct-input-card">
            <div class="input-card-header">
              <span class="input-card-title">① 歌い出し（開始位置）</span>
              <span class="input-card-badge" id="startPosBadge">00:00 からスタート</span>
            </div>

            <div class="min-sec-input-row">
              <div class="time-input-group">
                <input type="number" id="trimStartMinInput" class="time-num-input" min="0" max="59" step="1" value="0" inputmode="numeric" aria-label="開始位置（分）">
                <span class="time-unit">分</span>
              </div>
              <span class="time-colon">:</span>
              <div class="time-input-group">
                <input type="number" id="trimStartSecInput" class="time-num-input" min="0" max="59.5" step="0.5" value="0" inputmode="decimal" aria-label="開始位置（秒）">
                <span class="time-unit">秒</span>
              </div>
            </div>

            <!-- 開始位置の微調整ボタン（0.5秒・1秒単位：終了位置は固定されます） -->
            <div class="stepper-buttons-row">
              <button type="button" class="stepper-btn" id="startMinus1Btn" style="border-color: #fcd34d; color: #fde047; font-weight: 900;">◀ -1秒</button>
              <button type="button" class="stepper-btn" id="startMinusHalfBtn" style="border-color: #fde047; color: #fef08a; font-weight: 900;">◀ -0.5秒</button>
              <button type="button" class="stepper-btn" id="startPlusHalfBtn" style="border-color: #fde047; color: #fef08a; font-weight: 900;">+0.5秒 ▶</button>
              <button type="button" class="stepper-btn" id="startPlus1Btn" style="border-color: #fcd34d; color: #fde047; font-weight: 900;">+1秒 ▶</button>
            </div>

            <div style="font-size: 0.82rem; color: #fef08a; margin: 2px 0 10px 0; line-height: 1.35;">
              💡 開始位置をずらすと<strong>「終了位置」は固定のまま</strong>、動画の長さが自動計算されます。
            </div>

            <input type="range" id="trimStartSlider" class="super-fat-slider" min="0" max="300" value="0" step="0.5" aria-label="開始秒数スライダー">
          </div>

          <!-- ② 終了位置 ＆ 動画の長さ（秒数）の調整 -->
          <div class="trim-direct-input-card" style="margin-top: 16px;">
            <div class="input-card-header">
              <span class="input-card-title">② 終了位置 ＆ 何秒間歌わせるか</span>
              <span class="input-card-badge" id="durationBadge">15秒間（終了: 00:15）</span>
            </div>

            <!-- 終了位置（分・秒）の直接指定＆0.5秒/1秒ずらし -->
            <div style="background: rgba(236, 72, 153, 0.08); border: 1.5px solid rgba(244, 114, 182, 0.35); border-radius: 12px; padding: 12px; margin-bottom: 14px;">
              <div style="font-size: 1rem; font-weight: 800; color: #f472b6; margin-bottom: 8px;">
                🏁 歌い終わりの位置（終了位置）：
              </div>
              <div class="min-sec-input-row">
                <div class="time-input-group end-group">
                  <input type="number" id="trimEndMinInput" class="time-num-input" min="0" max="59" step="1" value="0" inputmode="numeric" aria-label="終了位置（分）">
                  <span class="time-unit">分</span>
                </div>
                <span class="time-colon">:</span>
                <div class="time-input-group end-group">
                  <input type="number" id="trimEndSecInput" class="time-num-input" min="0" max="59.5" step="0.5" value="15" inputmode="decimal" aria-label="終了位置（秒）">
                  <span class="time-unit">秒</span>
                </div>
              </div>
              <div class="stepper-buttons-row" style="margin-top: 8px;">
                <button type="button" class="stepper-btn" id="endMinus1Btn" style="border-color: #f472b6; color: #fbcfe8; font-weight: 900;">◀ 終了 -1秒</button>
                <button type="button" class="stepper-btn" id="endMinusHalfBtn" style="border-color: #f472b6; color: #fbcfe8; font-weight: 900;">◀ -0.5秒</button>
                <button type="button" class="stepper-btn" id="endPlusHalfBtn" style="border-color: #f472b6; color: #fbcfe8; font-weight: 900;">+0.5秒 ▶</button>
                <button type="button" class="stepper-btn" id="endPlus1Btn" style="border-color: #f472b6; color: #fbcfe8; font-weight: 900;">終了 +1秒 ▶</button>
              </div>
              <div style="font-size: 0.82rem; color: #fbcfe8; margin-top: 4px; line-height: 1.35;">
                💡 終了位置をずらすと<strong>「開始位置」は固定のまま</strong>、動画の長さが自動計算されます。
              </div>
            </div>

            <!-- 動画の長さ（秒間）の直接手入力＆0.5秒微調整 -->
            <div style="padding-top: 6px;">
              <div style="font-size: 0.98rem; font-weight: 800; color: #e2e8f0; margin-bottom: 8px;">
                ⏱ 動画の長さ（秒数・直接手入力できます）：
              </div>
              <div class="duration-input-row">
                <div class="time-input-group dur-group">
                  <input type="number" id="trimDurationInput" class="time-num-input" min="0.5" max="60" step="0.5" value="15" inputmode="decimal" aria-label="動画の長さ（秒間）">
                  <span class="time-unit">秒間</span>
                </div>
              </div>

              <!-- 長さの微調整ボタン（0.5秒・1秒単位） -->
              <div class="stepper-buttons-row" style="margin-top: 8px;">
                <button type="button" class="stepper-btn" id="durMinus1Btn" style="border-color: #38bdf8; color: #7dd3fc; font-weight: 900;">◀ -1秒</button>
                <button type="button" class="stepper-btn" id="durMinusHalfBtn" style="border-color: #38bdf8; color: #bae6fd; font-weight: 900;">◀ -0.5秒</button>
                <button type="button" class="stepper-btn" id="durPlusHalfBtn" style="border-color: #38bdf8; color: #bae6fd; font-weight: 900;">+0.5秒 ▶</button>
                <button type="button" class="stepper-btn" id="durPlus1Btn" style="border-color: #38bdf8; color: #7dd3fc; font-weight: 900;">+1秒 ▶</button>
              </div>
            </div>

            <input type="range" id="trimDurationSlider" class="super-fat-slider" min="0.5" max="60" value="15" step="0.5" aria-label="動画の長さスライダー" style="margin-top: 14px;">
          </div>

          <!-- 決定された区間の確認 ＆ 試聴ボタン -->
          <div class="trim-confirm-card" style="margin-top: 18px;">
            <div class="confirm-title">🎯 AIに歌わせる切り出し区間</div>
            <div class="confirm-detail" id="trimConfirmDetail">
              開始 <strong id="confirmStartTxt">00:00</strong> 〜 終了 <strong id="confirmEndTxt">00:15</strong> （合計 <strong id="confirmDurTxt">15秒間</strong>）
            </div>
            <button id="previewTrimBtn" class="giant-btn giant-play-inline-btn" type="button" style="margin-top: 14px; width: 100%;">
              <span id="previewTrimIcon">▶</span>
              <span id="previewTrimLabel">この区間だけを試聴する</span>
            </button>
          </div>

          <!-- カット音声単体のダウンロード（MP3 / WAV 形式選択対応） -->
          <div class="audio-save-options-card" style="margin-top: 16px; background: rgba(15, 23, 42, 0.85); border: 2px solid rgba(16, 185, 129, 0.35); border-radius: 16px; padding: 14px 16px;">
            <div style="font-size: 0.96rem; font-weight: 800; color: #6ee7b7; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">✂️</span>
              <span>切り出し楽曲データ単体を保存する</span>
            </div>
            <p style="font-size: 0.82rem; color: #94a3b8; margin: 0 0 12px 0; line-height: 1.45;">
              動画を生成せず、サビなどの切り出した音声だけを保存したい場合は、用途に合わせて形式を選べます：
            </p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button id="quickDownloadMp3Btn" class="giant-btn" type="button" style="flex: 1; min-width: 140px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(5, 150, 105, 0.3)); color: #6ee7b7; border: 2px solid #10b981; border-radius: 14px; padding: 14px 10px; font-size: 1rem; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span style="font-size: 1.4rem;">🎵</span>
                <div style="text-align: left; line-height: 1.25;">
                  <div style="font-size: 1rem;">MP3で保存</div>
                  <small style="font-size: 0.76rem; color: #a7f3d0; font-weight: 500;">軽量・扱いやすい</small>
                </div>
              </button>
              <button id="quickDownloadWavBtn" class="giant-btn" type="button" style="flex: 1; min-width: 140px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(37, 99, 235, 0.3)); color: #93c5fd; border: 2px solid #3b82f6; border-radius: 14px; padding: 14px 10px; font-size: 1rem; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span style="font-size: 1.4rem;">💎</span>
                <div style="text-align: left; line-height: 1.25;">
                  <div style="font-size: 1rem;">WAVで保存</div>
                  <small style="font-size: 0.76rem; color: #bfdbfe; font-weight: 500;">最高音質・無劣化</small>
                </div>
              </button>
              <button id="quickDownloadTrimmedBtn" type="button" style="display:none;" tabindex="-1"></button>
            </div>
          </div>
        </div>
      </section>

      <!-- ==========================================
           STEP 4: 完成動画のサイズ選択 ＆ AIリップシンク歌唱動画を生成する（Fal.ai API直結）
           ========================================== -->
      <section class="large-section" style="border: 2.5px solid #ec4899; background: linear-gradient(145deg, rgba(45, 18, 65, 0.94), rgba(15, 23, 42, 0.98));">
        <div class="section-title-wrap">
          <span class="step-badge highlight-badge">4</span>
          <div>
            <h3 class="section-title">完成動画のサイズ選択 ＆ AIリップシンク生成</h3>
            <p class="section-sub" id="step4Subtitle">仕上げたい完成動画のサイズ（縦型・横型・正方形）を選び、Fal.aiで本物のリップシンク動画を生成します</p>
          </div>
        </div>

        <div id="panelV11b" class="ai-version-panel">

          <!-- ========================================================
               📐 ① 完成動画のサイズ（画面比率・ピクセル解像度）の選択【必須機能】
               ======================================================== -->
          <div id="videoSizeSelectorCard" style="background: rgba(15, 23, 42, 0.92); border: 2px solid rgba(56, 189, 248, 0.65); border-radius: 16px; padding: 16px; margin-bottom: 20px;">
            <div style="font-size: 1.08rem; font-weight: 900; color: #7dd3fc; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
              <span>📐 ① 完成動画のサイズ（画面比率）を選択：</span>
              <span id="selectedSizeSummaryBadge" style="background: rgba(16, 185, 129, 0.25); border: 1.5px solid #10b981; color: #6ee7b7; font-size: 0.85rem; font-weight: 900; padding: 3px 10px; border-radius: 999px;">📱 縦型 9:16 (720×1280)</span>
            </div>
            <p style="font-size: 0.88rem; color: #cbd5e1; margin: 0 0 12px 0; line-height: 1.45;">
              用途（TikTok・YouTubeショート・YouTube横画面・インスタ等）に合わせて、完成する動画の形をワンタップで選べます：
            </p>

            <!-- 4つの特大サイズ選択ボタン -->
            <div class="video-size-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
              <!-- 1. 縦型 9:16 (スマホ全画面・ショート) -->
              <button type="button" class="video-size-btn active" data-size="9:16" data-label="縦型 9:16">
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <span style="font-size: 1.4rem;">📱</span>
                  <span class="size-pill">✔ 選択中</span>
                </div>
                <div>
                  <strong style="font-size: 1.05rem; display: block; color: #7dd3fc;">縦型 9:16</strong>
                  <small style="font-size: 0.78rem; color: #e2e8f0; display: block; line-height: 1.3;">スマホ全画面・TikTok・ショート・リール用</small>
                </div>
              </button>

              <!-- 2. 横型 16:9 (YouTube・テレビ・横MV) -->
              <button type="button" class="video-size-btn" data-size="16:9" data-label="横型 16:9">
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <span style="font-size: 1.4rem;">📺</span>
                  <span class="size-pill">タップで選択</span>
                </div>
                <div>
                  <strong style="font-size: 1.05rem; display: block; color: #f0abfc;">横型 16:9</strong>
                  <small style="font-size: 0.78rem; color: #cbd5e1; display: block; line-height: 1.3;">YouTube本編・横画面ワイドMV用</small>
                </div>
              </button>

              <!-- 3. 正方形 1:1 (インスタ・X・ジャケット) -->
              <button type="button" class="video-size-btn" data-size="1:1" data-label="正方形 1:1">
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <span style="font-size: 1.4rem;">🟦</span>
                  <span class="size-pill">タップで選択</span>
                </div>
                <div>
                  <strong style="font-size: 1.05rem; display: block; color: #6ee7b7;">正方形 1:1</strong>
                  <small style="font-size: 0.78rem; color: #cbd5e1; display: block; line-height: 1.3;">インスタ投稿・X・音楽ジャケット用</small>
                </div>
              </button>

              <!-- 4. 元素材のサイズそのまま（オリジナル比率） -->
              <button type="button" class="video-size-btn" data-size="original" data-label="元素材の比率のまま">
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <span style="font-size: 1.4rem;">🖼️</span>
                  <span class="size-pill">タップで選択</span>
                </div>
                <div>
                  <strong style="font-size: 1.05rem; display: block; color: #fcd34d;">元素材のまま</strong>
                  <small style="font-size: 0.78rem; color: #cbd5e1; display: block; line-height: 1.3;">写真・動画の元の縦横比をそのまま維持</small>
                </div>
              </button>
            </div>

            <!-- 縦横比が異なる場合のフィット方法 ＆ 解像度（720p / 1080p）選択 -->
            <div id="videoFitAndResControls" style="background: rgba(0, 0, 0, 0.35); border: 1.5px solid rgba(255, 255, 255, 0.14); border-radius: 12px; padding: 12px;">
              <div id="fitModeSubBox" style="margin-bottom: 12px;">
                <div style="font-size: 0.92rem; font-weight: 800; color: #e2e8f0; margin-bottom: 8px;">
                  🖼️ 写真の収め方（縦横比が違うとき）：
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <button type="button" class="video-fit-btn active" data-fit="cover">
                    🔍 画面いっぱいに拡大<br><small style="font-size: 0.74rem; color: #e9d5ff; font-weight: 500;">余白なし・顔優先で自動調整</small>
                  </button>
                  <button type="button" class="video-fit-btn" data-fit="contain_blur">
                    ✨ 写真全体を入れる<br><small style="font-size: 0.74rem; color: #94a3b8; font-weight: 500;">見切れなし・背景ぼかし余白</small>
                  </button>
                </div>
              </div>

              <div>
                <div style="font-size: 0.92rem; font-weight: 800; color: #e2e8f0; margin-bottom: 8px;">
                  🎞️ 完成動画の画質・ピクセル解像度：
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                  <button type="button" class="video-res-btn active" data-res="720p">
                    ⚡ 標準 HD (720p)<br><small style="font-size: 0.74rem; color: #a7f3d0; font-weight: 500;">高速・安定【おすすめ】</small>
                  </button>
                  <button type="button" class="video-res-btn" data-res="1080p">
                    💎 フルHD (1080p)<br><small style="font-size: 0.74rem; color: #94a3b8; font-weight: 500;">超高画質（1080×1920等）</small>
                  </button>
                </div>
              </div>

              <!-- 仕上がりサイズ・構図のリアルタイム確認プレビュー -->
              <div id="sizeFramingPreviewWrap" style="margin-top: 12px; display: flex; align-items: center; gap: 12px; background: rgba(15, 23, 42, 0.9); border: 1.5px solid rgba(56, 189, 248, 0.4); border-radius: 12px; padding: 10px 12px;">
                <div style="width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; background: #050811; border-radius: 8px; border: 1px solid rgba(255,255,255,0.18); flex-shrink: 0; overflow: hidden;">
                  <canvas id="sizeFramingPreviewCanvas" width="180" height="320" style="max-width: 68px; max-height: 68px; border-radius: 4px; border: 1.5px solid #38bdf8; display: block;"></canvas>
                </div>
                <div style="line-height: 1.4;">
                  <strong id="sizeFramingPreviewTitle" style="color: #7dd3fc; font-size: 0.94rem; display: block;">完成サイズ: 縦型 9:16 (720×1280)</strong>
                  <span id="sizeFramingPreviewSub" style="color: #cbd5e1; font-size: 0.82rem; display: block;">左の枠の形・構図でAIリップシンク動画が生成されます</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ========================================================
               🎙️ 【改善B】AIボーカル自動分離（伴奏カット口パク解析 ➔ 原曲再合成）
               ======================================================== -->
          <div id="vocalSeparationCard" style="background: rgba(6, 78, 59, 0.35); border: 2px solid #10b981; border-radius: 16px; padding: 16px; margin-bottom: 20px;">
            <div style="font-size: 1.08rem; font-weight: 900; color: #6ee7b7; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
              <span>🎙️ ②【改善B】AIボーカル自動分離（口パク精度アップ）：</span>
              <span id="vocalSepStatusBadge" style="background: rgba(16, 185, 129, 0.3); border: 1.5px solid #34d399; color: #ecfdf5; font-size: 0.85rem; font-weight: 900; padding: 3px 10px; border-radius: 999px;">✨ ON：自動分離する（推奨）</span>
            </div>
            <p style="font-size: 0.9rem; color: #e2e8f0; margin: 0 0 12px 0; line-height: 1.5;">
              ドラムやギター等の<strong>伴奏の音に反応して口が勝手にパクパク動くのを防ぐ機能</strong>です。<br>
              AI（Demucs）が曲から「歌声だけ」を抜き出して口パクを計算し、<strong>完成した動画には元の伴奏入りの高音質曲を自動で合体</strong>させます。
            </p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <button type="button" class="vocal-sep-btn active" data-sep="on" style="padding: 14px 10px;">
                ✨ ON：歌声だけ抽出して口パク<br><small style="font-size: 0.78rem; color: #a7f3d0; font-weight: 700;">伴奏入りの曲に必須【おすすめ】</small>
              </button>
              <button type="button" class="vocal-sep-btn" data-sep="off" style="padding: 14px 10px;">
                🎵 OFF：原曲のまま直接口パク<br><small style="font-size: 0.78rem; color: #cbd5e1; font-weight: 500;">アカペラ音源や時間短縮したい時</small>
              </button>
            </div>
            <!-- 抽出されたボーカル音源の試聴プレビュー（生成時に自動表示） -->
            <div id="isolatedVocalPreviewBox" class="hidden" style="margin-top: 12px; background: rgba(15, 23, 42, 0.9); border: 1.5px solid #34d399; border-radius: 12px; padding: 10px 12px;">
              <div style="font-size: 0.88rem; font-weight: 800; color: #6ee7b7; margin-bottom: 6px;">
                🎤 AIが抽出した「ボーカル声のみ」の音源（この声に合わせて口が動きます）：
              </div>
              <audio id="isolatedVocalAudioPlayer" controls preload="metadata" style="width: 100%; height: 38px;"></audio>
            </div>
          </div>

          <!-- ========================================================
               🔒 【最重要】「別人化ゼロ・元写真100%そのまま」完全保護ロック
               ======================================================== -->
          <div id="identityLockCard" style="background: rgba(88, 28, 135, 0.48); border: 2.5px solid #e879f9; border-radius: 16px; padding: 16px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(232, 121, 249, 0.25);">
            <div style="font-size: 1.08rem; font-weight: 900; color: #f5d0fe; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
              <span>🔒 ②-2 「別人化ゼロ」元写真100%顔固定・口唇限定ロック：</span>
              <span id="identityLockStatusBadge" style="background: rgba(217, 70, 239, 0.35); border: 1.5px solid #f0abfc; color: #fdf4ff; font-size: 0.85rem; font-weight: 900; padding: 3px 10px; border-radius: 999px;">🔒 ON：元写真の顔100%固定（必須推奨）</span>
            </div>
            <p style="font-size: 0.9rem; color: #f3e8ff; margin: 0 0 12px 0; line-height: 1.55;">
              AIが勝手に<strong>「別人の顔（違う目・違う鼻・違う輪郭）」を生成してしまうのを物理的に遮断する機能</strong>です。<br>
              ① アップした写真を<strong>無劣化のまま固定ビデオ（FFmpeg）に変換してAIによる全顔生成を禁止</strong>し、<br>
              ② <strong>目・眉・鼻・頬・輪郭・髪・背景は元写真の生ピクセルを100%そのまま維持</strong>した状態で、<strong>「くちびる（口唇）だけ」</strong>を優しい音量（-13dB）で動かします。
            </p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <button type="button" class="identity-lock-btn active" data-lock="on" style="padding: 14px 10px;">
                🔒 ON：写真の顔を100%固定（唇のみ）<br><small style="font-size: 0.78rem; color: #f5d0fe; font-weight: 700;">別人化・顔生成を完全禁止【必須推奨】</small>
              </button>
              <button type="button" class="identity-lock-btn" data-lock="off" style="padding: 14px 10px;">
                🔓 OFF：保護ロックなし<br><small style="font-size: 0.78rem; color: #cbd5e1; font-weight: 500;">顔や口が大きく変形することがあります</small>
              </button>
            </div>
          </div>

          <!-- ③ 使用するAIモデル一覧（v16.1: 顔生成ゼロ・元写真100%固定V2V口唇ピンポイント方式のみ厳選） -->
          <div style="font-size: 1.08rem; font-weight: 900; color: #fbcfe8; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <span>③ 使用するAIモデルをタップして選択（すべて「顔生成ゼロ・元写真100%固定」方式）：</span>
            <span id="currentMaterialIndicatorBadge" style="background: rgba(16, 185, 129, 0.35); border: 1px solid #34d399; color: #6ee7b7; font-size: 0.85rem; font-weight: 800; padding: 3px 10px; border-radius: 999px;">🔒 写真100%固定V2Vモード</span>
          </div>

          <!-- A. 写真／1コマ切り出し用AIモデル群（v16.1: 元写真無劣化ビデオ化 ➔ Video-to-Video 口唇限定同期のみ） -->
          <div id="photoModelsGroup" class="models-grid-group" style="margin-bottom: 18px;">
            <!-- Model 1 (DEFAULT): Photo-Lock FFmpeg ➔ Sync-3 Video-to-Video (lips-only) -->
            <button type="button" class="v11b-model-btn active" data-model="fal-ai/sync-lipsync/v3" data-mode="photolock_v2v" data-supports-prompt="false" data-label="🔒 Sync-3 Video Lips-Only (顔生成ゼロ・元写真100%固定)">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px; flex-wrap: wrap;">
                <strong style="font-size: 1.16rem; color: #6ee7b7;">👑 🔒 ① Sync-3 Video Lips-Only（【最推奨】顔生成ゼロ・元写真100%そのまま口唇のみ同期）</strong>
                <span class="v11b-model-pill" style="font-size: 0.88rem; padding: 4px 12px; border-radius: 999px;">✔ 選択中</span>
              </div>
              <span class="v11b-model-desc" style="font-size: 0.96rem; line-height: 1.5; display: block;">
                【別人化ゼロ！】アップした写真をそのまま無劣化固定ビデオ化し、動画専用の `sync-lipsync/v3`（`model_mode: "lips"`＝唇のみ編集）で<strong>くちびるだけを歌わせます。</strong>目・鼻・輪郭・画風は100%あなたの写真のまま絶対に変わりません！
              </span>
            </button>

            <!-- Model 2: Photo-Lock FFmpeg ➔ Sync React-1 (model_mode: "lips" strict minimal facial change) -->
            <button type="button" class="v11b-model-btn" data-model="fal-ai/sync-lipsync/react-1" data-mode="photolock_v2v" data-supports-prompt="false" data-label="🔒 Sync React-1 Lips-Only (唇のみ最小変化モード)">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px; flex-wrap: wrap;">
                <strong style="font-size: 1.15rem; color: #a7f3d0;">🔒 ② Sync React-1 Lips-Only（唇のみ最小編集モード `model_mode: "lips"`）</strong>
                <span class="v11b-model-pill" style="font-size: 0.85rem; padding: 4px 12px; border-radius: 999px;">タップで選択</span>
              </div>
              <span class="v11b-model-desc" style="font-size: 0.96rem; line-height: 1.45; display: block;">
                【目・鼻・頭部の変化を完全禁止した公式 `lips` 専用モード！】元写真の無劣化固定ビデオに対し、SyncLabs React-1 の<strong>「唇のみ編集（minimal facial changes）」</strong>を適用。顔の印象を1ミリも変えたくない時に最適です（※15秒超の曲は自動で①のSync-3 Lipsに連携）
              </span>
            </button>

            <!-- Model 3: Photo-Lock FFmpeg ➔ Kling Video LipSync / LatentSync V2V -->
            <button type="button" class="v11b-model-btn" data-model="fal-ai/kling-video/lipsync/audio-to-video" data-mode="photolock_v2v" data-supports-prompt="false" data-label="🔒 Kling LipSync V2V (写真固定ビデオ ➔ 口マスク専用)">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px; flex-wrap: wrap;">
                <strong style="font-size: 1.15rem; color: #bae6fd;">🔒 ③ Kling LipSync V2V ／ LatentSync（写真固定ビデオ ➔ 口周りマスク専用）</strong>
                <span class="v11b-model-pill" style="font-size: 0.85rem; padding: 4px 12px; border-radius: 999px;">タップで選択</span>
              </div>
              <span class="v11b-model-desc" style="font-size: 0.96rem; line-height: 1.45; display: block;">
                【顔生成ゼロ・口マスク限定インペイント】元写真を無劣化固定ビデオ化したうえで、動画の口元マスク領域だけを歌声に合わせる Video-to-Video 専用エンジン（Kling LipSync V2V ＆ LatentSync 自動連携）
              </span>
            </button>

            <!-- Model 4: Photo-Lock FFmpeg ➔ HeyGen v3 Precision / VEED v2 -->
            <button type="button" class="v11b-model-btn" data-model="fal-ai/heygen/v3/lipsync/precision" data-mode="photolock_v2v" data-supports-prompt="false" data-label="🔒 HeyGen v3 Precision V2V (写真固定ビデオ ➔ 精密アテレコ)">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px; flex-wrap: wrap;">
                <strong style="font-size: 1.15rem; color: #f5d0fe;">🔒 ④ HeyGen v3 Precision ／ VEED v2（写真固定ビデオ ➔ 高精度アテレコV2V）</strong>
                <span class="v11b-model-pill" style="font-size: 0.85rem; padding: 4px 12px; border-radius: 999px;">タップで選択</span>
              </div>
              <span class="v11b-model-desc" style="font-size: 0.96rem; line-height: 1.45; display: block;">
                【顔生成ゼロ・動画アテレコ方式】元写真の固定ビデオに対し、HeyGen v3 Precision（および VEED Lipsync v2）で元の顔立ちを保ったまま口元だけを精密にアテレコ合成します
              </span>
            </button>
          </div>

          <!-- B. 動画そのまま口元リップシンク用AIモデル群（動画パターン①/A） -->
          <div id="videoModelsGroup" class="models-grid-group hidden" style="margin-bottom: 18px;">
            <!-- Model V1: Sync Lipsync v3 -->
            <button type="button" class="v11b-model-btn" data-model="fal-ai/sync-lipsync/v3" data-mode="videolipsync" data-supports-prompt="false" data-label="Sync Lipsync v3 (最新動画口パク同期)">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px; flex-wrap: wrap;">
                <strong style="font-size: 1.15rem;">🎥 Sync Lipsync v3（最新動画リップシンク・おすすめ）</strong>
                <span class="v11b-model-pill" style="font-size: 0.85rem; padding: 4px 12px; border-radius: 999px;">タップで選択</span>
              </div>
              <span class="v11b-model-desc" style="font-size: 0.96rem; line-height: 1.45; display: block;">【動画＋楽曲 ➔ 歌唱動画】元動画の画質・動き・カメラワーク・背景を100%保持し、口元の動きだけを曲に合わせて高精度に同期</span>
            </button>

            <!-- Model V2: HeyGen v3 Lipsync Precision -->
            <button type="button" class="v11b-model-btn" data-model="fal-ai/heygen/v3/lipsync/precision" data-mode="videolipsync" data-supports-prompt="false" data-label="HeyGen v3 Precision (2026最新・高精度動画口パク)">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px; flex-wrap: wrap;">
                <strong style="font-size: 1.15rem;">💎 HeyGen v3 Precision（2026最新・超高精度動画リップシンク）</strong>
                <span class="v11b-model-pill" style="font-size: 0.85rem; padding: 4px 12px; border-radius: 999px;">タップで選択</span>
              </div>
              <span class="v11b-model-desc" style="font-size: 0.96rem; line-height: 1.45; display: block;">【動画＋楽曲 ➔ 歌唱動画】HeyGen最新のv3 Precisionエンジン。元動画の人物の顔立ちを崩さず口元だけを精密に同期</span>
            </button>

            <!-- Model V3: VEED Lipsync v2 -->
            <button type="button" class="v11b-model-btn" data-model="veed/lipsync/v2" data-mode="videolipsync" data-supports-prompt="false" data-label="VEED Lipsync v2 (2026年7月最新・自然な動画口パク)">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px; flex-wrap: wrap;">
                <strong style="font-size: 1.15rem;">✨ VEED Lipsync v2（2026年7月最新・自然な口元アテレコ）</strong>
                <span class="v11b-model-pill" style="font-size: 0.85rem; padding: 4px 12px; border-radius: 999px;">タップで選択</span>
              </div>
              <span class="v11b-model-desc" style="font-size: 0.96rem; line-height: 1.45; display: block;">【動画＋楽曲 ➔ 歌唱動画】VEED最新v2リップシンクAI。動いている人物動画の口元を控えめで自然な形に合わせて合成</span>
            </button>
          </div>

          <!-- AI生成ステータス＆リアルタイム進捗ボックス -->
          <div id="aiGenStatusBox" class="hidden" style="background: rgba(15, 23, 42, 0.95); border: 2.5px solid #38bdf8; border-radius: 14px; padding: 16px; margin-bottom: 16px; color: #e0f2fe; font-size: 1.05rem; font-weight: 800; line-height: 1.6;">
            ⏳ AIリップシンク動画を準備しています...
          </div>

          <!-- ④ 特大アクションボタン（本番AIリップシンク生成一本！） -->
          <button id="generateAiLipsyncBtn" type="button" class="giant-btn" style="width: 100%; background: linear-gradient(135deg, #a855f7, #ec4899); padding: 20px 16px; font-size: 1.18rem; border: 2.5px solid #f0abfc; border-radius: 16px; color: #fff; font-weight: 900; cursor: pointer; box-shadow: 0 8px 25px rgba(236, 72, 153, 0.45);">
            <span>✨ APIでAIリップシンク歌唱動画を生成する</span>
          </button>

          <!-- 生成完了したAIリップシンク動画のインライン確認＆即保存カード -->
          <div id="aiResultCard" class="hidden" style="margin-top: 20px; background: rgba(6, 78, 59, 0.45); border: 2.5px solid #10b981; border-radius: 16px; padding: 18px;">
            <div style="font-size: 1.15rem; font-weight: 900; color: #6ee7b7; margin-bottom: 10px;">
              🎉 AIリップシンク動画（音声付きMP4）が完成しました！
            </div>
            <div id="inlineVideoPlayerWrap" style="position: relative; width: 100%; margin-bottom: 14px; border-radius: 12px; overflow: hidden; background: #000;">
              <video id="inlineAiResultVideo" controls playsinline preload="auto" style="width: 100%; max-height: 420px; border-radius: 12px; background: #000; display: block;"></video>
              <canvas id="inlineFaceGuardOverlay" class="hidden" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2;"></canvas>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <button id="saveAiResultToPhotosBtn" type="button" class="giant-btn" style="width: 100%; background: linear-gradient(135deg, #10b981, #059669); border: 2px solid #6ee7b7; border-radius: 14px; padding: 16px; font-size: 1.1rem; font-weight: 900; color: #fff; cursor: pointer;">
                <span>📱 このAI動画を写真（カメラロール）に保存・共有</span>
              </button>
              <button id="downloadAiResultMp4Btn" type="button" class="giant-btn" style="width: 100%; background: rgba(15, 23, 42, 0.9); border: 2px solid #38bdf8; border-radius: 14px; padding: 14px; font-size: 1.02rem; font-weight: 800; color: #7dd3fc; cursor: pointer;">
                <span>⬇️ MP4ファイルとしてダウンロード</span>
              </button>
            </div>
          </div>

          <!-- 旧ステージ用読み込み・STEP 5（チープな2Dステージ重ね録画）は完全撤廃・非表示 -->
          <div class="hidden">
            <input type="file" id="aiVideoFileInput" accept="video/mp4,video/quicktime,video/*">
            <h4 id="exportSummaryTitle"></h4>
            <p id="exportSummaryDesc"></p>
            <button id="mainPlayBtn"><span id="mainPlayIcon">▶</span><span id="mainPlayText"></span></button>
            <button id="finalRecordBtn"><span id="finalRecText"></span></button>
            <h2 id="controlSongTitle"></h2>
            <span id="controlTrimRangeBadge"></span>
            <span id="controlSongTime"></span>
            <button id="mainRecordBtn"><span id="mainRecText"></span></button>
            <button id="jumpToStageBtn"></button>
            <button id="openAiSettingsBtn"></button>
          </div>
        </div>
      </section>

      <div style="height: 80px;"></div>
    </main>

    <!-- =============================================================== -->
    <!-- VIEW 2: MV映像 (iPhoneの画面いっぱいに広がる全画面動画ビュー) -->
    <!-- =============================================================== -->
    <div id="viewStage" class="stage-view-fullscreen hidden">
      <canvas id="stageCanvas" width="720" height="1280"></canvas>

      <!-- Top Overlay: Return to Controls button -->
      <div class="stage-fullscreen-header">
        <button id="backToControlsBtn" class="stage-back-btn">
          <span>← 🎛️ 制作スタジオに戻る</span>
        </button>
        <span class="stage-mode-indicator" id="stageBpmIndicator">-- BPM</span>
      </div>

      <!-- Center Floating Lyrics -->
      <div class="stage-center-lyrics" id="stageLyrics">
        <h2 id="lyricsText">AIリップシンクステージ</h2>
      </div>

      <!-- Realtime Beat Pulse Badge -->
      <div class="stage-viseme-badge">
        <span>BEAT: <strong id="stageVisemeChar">SYNC</strong></span>
      </div>

      <!-- Bottom Floating Player Controls -->
      <div class="stage-fullscreen-footer">
        <div class="stage-progress-bar" id="stageProgressWrap">
          <div class="stage-progress-fill" id="stageProgressFill"></div>
        </div>

        <div class="stage-footer-row">
          <div class="stage-song-info">
            <strong id="stageSongTitle">楽曲未設定</strong>
            <span id="stageSongTime">00:00 / 00:00</span>
          </div>

          <div class="stage-footer-btns">
            <button id="stagePlayBtn" class="stage-circle-btn play">
              <span id="stagePlayIcon">▶</span>
            </button>
            <button id="stageRecordBtn" class="stage-circle-btn rec">
              <span class="stage-rec-dot"></span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- AI API Settings Modal (v12 Fal.ai Unified API Key with persistent memory) -->
    <div id="aiSettingsModal" class="modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="aiSettingsModalTitle">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-sparkle-icon">🔑</span>
            <h3 id="aiSettingsModalTitle" class="modal-title">Fal.ai APIキーの取得・登録</h3>
          </div>
          <button id="closeAiSettingsBtn" class="modal-close-icon" aria-label="閉じる">✕</button>
        </div>
        <div class="modal-body">
          <div style="background: rgba(168, 85, 247, 0.16); border: 2px solid rgba(192, 132, 252, 0.65); border-radius: 14px; padding: 16px; margin-bottom: 16px;">
            <strong style="color: #f0abfc; display: block; margin-bottom: 8px; font-size: 1.08rem;">🔑 Fal.ai APIキーを貼り付けてください</strong>
            <p style="color: #e2e8f0; font-size: 0.95rem; margin: 0 0 12px 0; line-height: 1.5;">
              一度保存すればお使いのiPhoneに記憶され、次回から入力不要で <strong>OmniHuman v1.5 / Kling AI Avatar v2 / MiniMax Lip-Sync</strong> がすべて使えます。
            </p>
            <input type="password" id="falApiKeyInput" placeholder="ここに Fal.ai APIキーを貼り付け" style="width: 100%; box-sizing: border-box; background: rgba(15, 23, 42, 0.95); border: 2px solid #c084fc; border-radius: 12px; padding: 15px; color: #fff; font-size: 1.05rem; margin-bottom: 12px;">
            <button id="saveAiSettingsBtn" class="giant-btn" style="width: 100%; background: linear-gradient(135deg, #a855f7, #ec4899); border: 2px solid #f0abfc; border-radius: 14px; padding: 16px; font-size: 1.08rem; color: #fff; font-weight: 900; cursor: pointer;">
              ✔ キーをiPhoneに記憶・保存する
            </button>
          </div>

          <div style="background: rgba(15, 23, 42, 0.9); border: 1.5px solid rgba(56, 189, 248, 0.5); border-radius: 14px; padding: 14px; margin-bottom: 14px; font-size: 0.95rem; color: #e2e8f0; line-height: 1.55;">
            <strong style="color: #7dd3fc; display: block; margin-bottom: 6px; font-size: 1.02rem;">📖 APIキーの取得先（Fal.ai 公式）：</strong>
            1. <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener" style="color: #38bdf8; font-weight: 900; text-decoration: underline;">fal.ai/dashboard/keys</a> を開いてGoogle等でログイン<br>
            2. <a href="https://fal.ai/dashboard/billing" target="_blank" rel="noopener" style="color: #6ee7b7; font-weight: 900; text-decoration: underline;">fal.ai/dashboard/billing</a> でクレジット（$5〜$10程度）をチャージ<br>
            3. Keys画面の「+ Add key」を押して発行されたキーをコピーし、上の欄に貼り付けて保存してください。
          </div>

          <button id="closeAiSettingsBottomBtn" type="button" class="modal-btn-sub" style="width: 100%; padding: 14px; font-size: 1rem;">
            <span>閉じる（制作スタジオに戻る）</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Video Complete & Save Modal (iPhone Accessible) -->
    <div id="videoCompleteModal" class="modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="completeModalTitle">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-sparkle-icon">🎉</span>
            <h3 id="completeModalTitle" class="modal-title">MV動画が完成しました！</h3>
          </div>
          <button id="closeModalCrossBtn" class="modal-close-icon" aria-label="閉じる">✕</button>
        </div>

        <div class="modal-body">
          <!-- Video preview player -->
          <div class="modal-video-wrapper">
            <video id="completeVideoPreview" controls playsinline preload="auto"></video>
          </div>

          <div class="modal-actions-list">
            <!-- Save to Photos / Camera Roll Button -->
            <button id="saveToPhotosBtn" class="giant-save-photos-btn" type="button">
              <span class="btn-icon">📱</span>
              <div class="btn-text-col">
                <strong>写真（カメラロール）に保存・共有</strong>
                <span>タップしてメニューの「ビデオを保存」を押すと写真アプリに入ります</span>
              </div>
            </button>

            <!-- Direct File Download Button -->
            <button id="directDownloadBtn" class="giant-download-file-btn" type="button">
              <span class="btn-icon">⬇️</span>
              <div class="btn-text-col">
                <strong>ファイルとしてダウンロード</strong>
                <span>「ファイル」アプリの「ダウンロード」フォルダに保存</span>
              </div>
            </button>

            <!-- Direct link fallback -->
            <a id="modalDownloadLink" class="modal-link-fallback" href="#" target="_blank" rel="noopener">🔗 動画を直接開く・長押しで保存する</a>
          </div>

          <!-- Step-by-step guidance for iPhone -->
          <div class="save-guidance-card">
            <div class="guidance-head">
              <span>📱</span>
              <strong>iPhoneでの保存場所のご案内</strong>
            </div>
            <div class="guidance-step">
              <span class="step-num">1</span>
              <div>
                <strong>「写真（カメラロール）」に入れたい時：</strong>
                <p>上の【写真に保存・共有】ボタンを押し、出てきたメニューから<strong>「ビデオを保存」</strong>をタップしてください。</p>
              </div>
            </div>
            <div class="guidance-step">
              <span class="step-num">2</span>
              <div>
                <strong>ダウンロードされた動画を探す時：</strong>
                <p>iPhoneの青いフォルダマーク<strong>「ファイル」アプリ ＞「ダウンロード」フォルダ</strong>に入っています。</p>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button id="closeModalBottomBtn" class="modal-btn-sub" type="button">
            <span>制作スタジオに戻る</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Audio Complete & Save Modal (iPhone & Mobile Accessible) -->
    <div id="audioCompleteModal" class="modal-overlay hidden" role="dialog" aria-modal="true" aria-labelledby="audioCompleteModalTitle">
      <div class="modal-card">
        <div class="modal-header" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.35), rgba(139, 92, 246, 0.3)); border-bottom: 1.5px solid rgba(110, 231, 183, 0.3);">
          <div class="modal-title-group">
            <span class="modal-sparkle-icon">✂️</span>
            <h3 id="audioCompleteModalTitle" class="modal-title">カット音声を切り出しました！</h3>
          </div>
          <button id="closeAudioModalCrossBtn" class="modal-close-icon" aria-label="閉じる">✕</button>
        </div>

        <div class="modal-body">
          <!-- 形式切り替えタブ（MP3 / WAV） -->
          <div style="margin-bottom: 12px;">
            <div style="font-size: 0.82rem; color: #cbd5e1; font-weight: 700; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
              <span>保存形式を選択:</span>
              <span id="modalFormatExplainer" style="font-size: 0.75rem; color: #94a3b8; font-weight: 500;">MP3: 軽量 | WAV: 最高音質</span>
            </div>
            <div style="display: flex; gap: 8px; background: rgba(15, 23, 42, 0.95); padding: 5px; border-radius: 12px; border: 1.5px solid rgba(255, 255, 255, 0.12);">
              <button id="modalFormatMp3Btn" type="button" class="format-tab-btn active" style="flex: 1; padding: 10px 8px; border-radius: 9px; border: none; font-size: 0.92rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; background: #10b981; color: #fff; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);">
                <span>🎵</span>
                <span>MP3 (軽量)</span>
              </button>
              <button id="modalFormatWavBtn" type="button" class="format-tab-btn" style="flex: 1; padding: 10px 8px; border-radius: 9px; border: none; font-size: 0.92rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; background: transparent; color: #94a3b8;">
                <span>💎</span>
                <span>WAV (最高音質)</span>
              </button>
            </div>
          </div>

          <div style="background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(110, 231, 183, 0.35); border-radius: 14px; padding: 14px 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; gap: 8px;">
              <span id="modalAudioFileName" style="font-weight: 800; color: #fff; font-size: 0.95rem; word-break: break-all;">song_cut.mp3</span>
              <span id="modalAudioFormatBadge" style="background: rgba(16, 185, 129, 0.25); color: #6ee7b7; border: 1px solid #10b981; border-radius: 6px; padding: 2px 8px; font-size: 0.78rem; font-weight: 700; flex-shrink: 0;">MP3</span>
            </div>
            <div id="modalAudioMeta" style="font-size: 0.84rem; color: #94a3b8;">
              区間: 00:00 〜 00:15 (15秒間)
            </div>
          </div>

          <div style="background: #0f172a; border-radius: 12px; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
            <div style="font-size: 0.82rem; color: #cbd5e1; margin-bottom: 8px; font-weight: 700; display: flex; align-items: center; gap: 6px;">
              <span>🎧</span>
              <span>切り出した音声を今すぐ試聴:</span>
            </div>
            <audio id="completeAudioPreview" controls playsinline preload="auto" style="width: 100%; height: 44px; border-radius: 8px; outline: none;"></audio>
          </div>

          <div id="modalStudioLyricsCard" class="hidden">
            <button id="copyStudioLyricsBtn" type="button">コピー</button>
            <div id="modalStudioLyricsPreview"></div>
          </div>

          <div class="modal-actions-list">
            <button id="saveAudioToPhoneBtn" class="giant-save-photos-btn" type="button" style="background: linear-gradient(135deg, #10b981, #06b6d4); border-color: #34d399; box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);">
              <span class="btn-icon" style="font-size: 1.6rem;">📱</span>
              <div class="btn-text-col">
                <strong id="saveAudioBtnText" style="font-size: 1.05rem;">切り出し音声(MP3)をスマホに保存 / 共有</strong>
                <span id="saveAudioBtnSub" style="font-size: 0.82rem;">「"ファイル"に保存」でiPhone内に保存できます</span>
              </div>
            </button>

            <button id="directAudioDownloadBtn" class="giant-download-file-btn" type="button" style="padding: 12px 10px; justify-content: center;">
              <span class="btn-icon" style="font-size: 1.3rem;">⬇️</span>
              <div class="btn-text-col" style="text-align: left;">
                <strong id="directAudioBtnText" style="font-size: 0.95rem;">MP3ファイルを直接ダウンロード</strong>
              </div>
            </button>
            <button id="directLyricsDownloadBtn" class="hidden" type="button"></button>
            <a id="modalAudioDirectLink" class="modal-link-fallback" href="#" target="_blank" rel="noopener">↗️ 音声を新しいタブで開く・長押し保存</a>
          </div>
        </div>

        <div class="modal-footer">
          <button id="closeAudioModalBottomBtn" class="modal-btn-sub" type="button">
            <span>制作スタジオに戻る</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Notification Toast -->
    <div id="toast" class="toast hidden">
      <span id="toastMsg">通知メッセージ</span>
    </div>
  </div>

  <!-- Scripts -->
  <script src="https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js"></script>
  <script src="lame.min.js"></script>
  <script src="audio-engine.js?v=20261025_161"></script>
  <script src="presets.js?v=20261025_161"></script>
  <script src="character-renderer.js?v=20261025_161"></script>
  <script src="app.js?v=20261025_161"></script>
</body>
</html>

```

### 5.2 `app.js`

```javascript
/**
 * GrooveSync MV - Main Controller (Workflow & Audio Trimming)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Views
  const viewControls = document.getElementById('viewControls');
  const viewStage = document.getElementById('viewStage');
  const tabBtnControls = document.getElementById('tabBtnControls');
  const tabBtnStage = document.getElementById('tabBtnStage');
  const tabControlsSub = document.getElementById('tabControlsSub');
  const tabStageSub = document.getElementById('tabStageSub');
  const zoomToggleBtn = document.getElementById('zoomToggleBtn');
  const zoomBtnText = document.getElementById('zoomBtnText');
  const zoomStatusBadge = document.getElementById('zoomStatusBadge');
  const jumpToStageBtn = document.getElementById('jumpToStageBtn');
  const backToControlsBtn = document.getElementById('backToControlsBtn');

  // Stage Canvas
  const stageCanvas = document.getElementById('stageCanvas');

  // Master Player Elements
  const controlSongTitle = document.getElementById('controlSongTitle');
  const controlSongTime = document.getElementById('controlSongTime');
  const controlTrimRangeBadge = document.getElementById('controlTrimRangeBadge');
  const mainPlayBtn = document.getElementById('mainPlayBtn');
  const mainPlayIcon = document.getElementById('mainPlayIcon');
  const mainPlayText = document.getElementById('mainPlayText');
  const mainRecordBtn = document.getElementById('mainRecordBtn');
  const mainRecText = document.getElementById('mainRecText');
  const finalRecordBtn = document.getElementById('finalRecordBtn');
  const finalRecText = document.getElementById('finalRecText');

  // Trimmer Elements
  const trimStartReadout = document.getElementById('trimStartReadout');
  const trimEndReadout = document.getElementById('trimEndReadout');
  const trimDurationReadout = document.getElementById('trimDurationReadout');
  const trimStartSlider = document.getElementById('trimStartSlider');
  const trimDurationSlider = document.getElementById('trimDurationSlider');
  const startSliderVal = document.getElementById('startSliderVal');
  const durationSliderVal = document.getElementById('durationSliderVal');
  const previewTrimBtn = document.getElementById('previewTrimBtn');
  const previewTrimIcon = document.getElementById('previewTrimIcon');
  const previewTrimLabel = document.getElementById('previewTrimLabel');
  const trimPresetChips = document.querySelectorAll('.trim-preset-chip');
  const exportSummaryTitle = document.getElementById('exportSummaryTitle');
  const exportSummaryDesc = document.getElementById('exportSummaryDesc');

  // Direct Min/Sec Inputs & Steppers (v12.6 with 0.5s precision)
  const trimStartMinInput = document.getElementById('trimStartMinInput');
  const trimStartSecInput = document.getElementById('trimStartSecInput');
  const startMinus1Btn = document.getElementById('startMinus1Btn');
  const startMinusHalfBtn = document.getElementById('startMinusHalfBtn');
  const startPlusHalfBtn = document.getElementById('startPlusHalfBtn');
  const startPlus1Btn = document.getElementById('startPlus1Btn');
  const trimDurationInput = document.getElementById('trimDurationInput');
  const durMinus1Btn = document.getElementById('durMinus1Btn');
  const durMinusHalfBtn = document.getElementById('durMinusHalfBtn');
  const durPlusHalfBtn = document.getElementById('durPlusHalfBtn');
  const durPlus1Btn = document.getElementById('durPlus1Btn');
  const trimEndMinInput = document.getElementById('trimEndMinInput');
  const trimEndSecInput = document.getElementById('trimEndSecInput');
  const endMinus1Btn = document.getElementById('endMinus1Btn');
  const endMinusHalfBtn = document.getElementById('endMinusHalfBtn');
  const endPlusHalfBtn = document.getElementById('endPlusHalfBtn');
  const endPlus1Btn = document.getElementById('endPlus1Btn');
  const startPosBadge = document.getElementById('startPosBadge');
  const durationBadge = document.getElementById('durationBadge');
  const confirmStartTxt = document.getElementById('confirmStartTxt');
  const confirmEndTxt = document.getElementById('confirmEndTxt');
  const confirmDurTxt = document.getElementById('confirmDurTxt');

  // Full Song Preview Player & Timeline Elements
  const fullPlayerCurrentTime = document.getElementById('fullPlayerCurrentTime');
  const fullPlayerTotalTime = document.getElementById('fullPlayerTotalTime');
  const fullPlayerStatusBadge = document.getElementById('fullPlayerStatusBadge');
  const timelineTrack = document.getElementById('timelineTrack');
  const timelineSelectionRange = document.getElementById('timelineSelectionRange');
  const timelinePlayhead = document.getElementById('timelinePlayhead');
  const fullSongSeekSlider = document.getElementById('fullSongSeekSlider');
  const timelineMidLabel = document.getElementById('timelineMidLabel');
  const timelineEndLabel = document.getElementById('timelineEndLabel');
  const fullPlayToggleBtn = document.getElementById('fullPlayToggleBtn');
  const fullPlayIcon = document.getElementById('fullPlayIcon');
  const fullPlayLabel = document.getElementById('fullPlayLabel');
  const fullPlayRewindBtn = document.getElementById('fullPlayRewindBtn');
  const setStartFromCurrentBtn = document.getElementById('setStartFromCurrentBtn');
  const setEndFromCurrentBtn = document.getElementById('setEndFromCurrentBtn');

  // Fullscreen Stage Player Elements
  const stagePlayBtn = document.getElementById('stagePlayBtn');
  const stagePlayIcon = document.getElementById('stagePlayIcon');
  const stageRecordBtn = document.getElementById('stageRecordBtn');
  const stageSongTitle = document.getElementById('stageSongTitle');
  const stageSongTime = document.getElementById('stageSongTime');
  const stageProgressWrap = document.getElementById('stageProgressWrap');
  const stageProgressFill = document.getElementById('stageProgressFill');
  const stageBpmIndicator = document.getElementById('stageBpmIndicator');
  const stageVisemeChar = document.getElementById('stageVisemeChar');
  const lyricsText = document.getElementById('lyricsText');

  // File Upload Elements
  const audioUploadBtn = document.getElementById('audioUploadBtn');
  const audioFileInput = document.getElementById('audioFileInput');
  const audioCardTitle = document.getElementById('audioCardTitle');
  const audioUploadHint = document.getElementById('audioUploadHint');

  const avatarUploadBtn = document.getElementById('avatarUploadBtn');
  const avatarFileInput = document.getElementById('avatarFileInput');
  const avatarCardTitle = document.getElementById('avatarCardTitle');
  const avatarCardHint = document.getElementById('avatarCardHint');
  const avatarCardIcon = document.getElementById('avatarCardIcon');
  const avatarPreviewImg = document.getElementById('avatarPreviewImg');

  // Mouth / Lip-Sync Adjuster Elements
  const mouthPosVal = document.getElementById('mouthPosVal');
  const mouthPosSlider = document.getElementById('mouthPosSlider');
  const mouthPosUpBtn = document.getElementById('mouthPosUpBtn');
  const mouthPosDownBtn = document.getElementById('mouthPosDownBtn');
  const testLipsyncBtn = document.getElementById('testLipsyncBtn');

  // Custom Avatar Banner Elements
  const customAvatarBanner = document.getElementById('customAvatarBanner');
  const customAvatarStatusTitle = document.getElementById('customAvatarStatusTitle');
  const customAvatarStatusSub = document.getElementById('customAvatarStatusSub');
  const viewStageFromAvatarBtn = document.getElementById('viewStageFromAvatarBtn');
  const changeAvatarBtn = document.getElementById('changeAvatarBtn');
  const resetToPresetBtn = document.getElementById('resetToPresetBtn');
  let savedCustomAvatarCanvas = null;
  let savedCustomAvatarName = '';

  // Mic
  const micToggleBtn = document.getElementById('micToggleBtn');
  const micBtnTitle = document.getElementById('micBtnTitle');

  // Engines
  const audioEngine = new window.AudioEngine();
  const characterRenderer = new window.CharacterRenderer(stageCanvas);

  // Trimming State (v12.6: Start and End positions can be independently adjusted with 0.5s precision)
  let trimStartSeconds = 0;
  let trimEndSeconds = 15;
  let trimDurationSeconds = 15;

  // Recording State & Storage
  let mediaRecorder = null;
  let recordedChunks = [];
  let isRecording = false;
  let recordTimer = null;
  let lastRecordedBlob = null;
  let lastRecordedUrl = null;
  let lastRecordedFilename = '';
  let lastRecordedFile = null;

  // Video Complete Modal Elements
  const videoCompleteModal = document.getElementById('videoCompleteModal');
  const completeVideoPreview = document.getElementById('completeVideoPreview');
  const saveToPhotosBtn = document.getElementById('saveToPhotosBtn');
  const directDownloadBtn = document.getElementById('directDownloadBtn');
  const closeModalCrossBtn = document.getElementById('closeModalCrossBtn');
  const closeModalBottomBtn = document.getElementById('closeModalBottomBtn');
  const modalDownloadLink = document.getElementById('modalDownloadLink');

  let currentSongConfig = null;

  // Haptic Feedback
  function triggerHaptic() {
    if (navigator.vibrate) {
      navigator.vibrate(25);
    }
  }

  // Toast
  function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (!toast || !toastMsg) return;
    toastMsg.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  // Format mm:ss or mm:ss.s (supports 0.5s precision)
  function formatTime(sec, showDecimal = true) {
    if (isNaN(sec) || sec < 0) sec = 0;
    if (!showDecimal) {
      const totalSec = Math.floor(sec);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    const totalTenths = Math.round(sec * 10);
    const totalSec = Math.floor(totalTenths / 10);
    const frac = totalTenths % 10;
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const base = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return frac !== 0 ? `${base}.${frac}` : base;
  }

  function formatDurationText(sec) {
    const rounded = Math.round((sec || 0) * 10) / 10;
    const isInt = (Math.abs(rounded - Math.round(rounded)) < 0.05);
    return `${isInt ? Math.round(rounded) : rounded.toFixed(1)}秒間`;
  }

  // ==========================================
  // Trimmer Sync & Update Function
  // ==========================================
  function updateTrimmerUI() {
    const totalDuration = audioEngine.duration || 0;
    if (totalDuration <= 0) {
      if (trimStartReadout) trimStartReadout.textContent = '00:00';
      if (trimEndReadout) trimEndReadout.textContent = '00:00';
      if (trimDurationReadout) trimDurationReadout.textContent = '--秒間';
      if (startSliderVal) startSliderVal.textContent = '00:00';
      if (durationSliderVal) durationSliderVal.textContent = '--秒';
      if (startPosBadge) startPosBadge.textContent = '楽曲を取り込むと設定できます';
      if (durationBadge) durationBadge.textContent = '未設定';
      if (confirmStartTxt) confirmStartTxt.textContent = '00:00';
      if (confirmEndTxt) confirmEndTxt.textContent = '00:00';
      if (confirmDurTxt) confirmDurTxt.textContent = '--秒間';
      if (previewTrimLabel) previewTrimLabel.textContent = '楽曲を取り込むと試聴できます';
      if (fullPlayerCurrentTime) fullPlayerCurrentTime.textContent = '00:00';
      if (fullPlayerTotalTime) fullPlayerTotalTime.textContent = '00:00';
      if (timelineMidLabel) timelineMidLabel.textContent = '00:00';
      if (timelineEndLabel) timelineEndLabel.textContent = '00:00';
      return;
    }

    // Ensure valid bounds
    trimStartSeconds = Math.max(0, Math.min(trimStartSeconds, totalDuration - 0.5));
    trimStartSeconds = Math.round(trimStartSeconds * 2) / 2;

    trimEndSeconds = Math.max(trimStartSeconds + 0.5, Math.min(trimEndSeconds, totalDuration));
    trimEndSeconds = Math.round(trimEndSeconds * 2) / 2;

    trimDurationSeconds = Math.max(0.5, Math.round((trimEndSeconds - trimStartSeconds) * 10) / 10);

    // Apply to AudioEngine
    audioEngine.setTrimRange(trimStartSeconds, trimEndSeconds);

    // Readouts
    if (trimStartReadout) trimStartReadout.textContent = formatTime(trimStartSeconds);
    if (trimEndReadout) trimEndReadout.textContent = formatTime(trimEndSeconds);
    if (trimDurationReadout) trimDurationReadout.textContent = formatDurationText(trimDurationSeconds);

    if (startSliderVal) startSliderVal.textContent = formatTime(trimStartSeconds);
    if (durationSliderVal) durationSliderVal.textContent = formatDurationText(trimDurationSeconds).replace('間', '');

    if (trimStartSlider) {
      trimStartSlider.value = trimStartSeconds;
      trimStartSlider.max = Math.max(0.5, Math.round((totalDuration - 0.5) * 2) / 2);
    }

    if (trimDurationSlider) {
      trimDurationSlider.value = trimDurationSeconds;
      trimDurationSlider.max = Math.max(0.5, Math.min(60, Math.round(totalDuration * 2) / 2));
    }

    // Direct Min / Sec Inputs (avoid cursor jumping if currently focused)
    if (trimStartMinInput && document.activeElement !== trimStartMinInput) {
      trimStartMinInput.value = Math.floor(trimStartSeconds / 60);
    }
    if (trimStartSecInput && document.activeElement !== trimStartSecInput) {
      const secRem = Math.round((trimStartSeconds % 60) * 10) / 10;
      trimStartSecInput.value = (secRem % 1 === 0) ? secRem : secRem.toFixed(1);
    }
    if (trimEndMinInput && document.activeElement !== trimEndMinInput) {
      trimEndMinInput.value = Math.floor(trimEndSeconds / 60);
    }
    if (trimEndSecInput && document.activeElement !== trimEndSecInput) {
      const endSecRem = Math.round((trimEndSeconds % 60) * 10) / 10;
      trimEndSecInput.value = (endSecRem % 1 === 0) ? endSecRem : endSecRem.toFixed(1);
    }
    if (trimDurationInput && document.activeElement !== trimDurationInput) {
      const durVal = Math.round(trimDurationSeconds * 10) / 10;
      trimDurationInput.value = (durVal % 1 === 0) ? durVal : durVal.toFixed(1);
    }

    if (startPosBadge) {
      startPosBadge.textContent = `${formatTime(trimStartSeconds)} からスタート`;
    }
    if (durationBadge) {
      durationBadge.textContent = `${formatDurationText(trimDurationSeconds)}（終了: ${formatTime(trimEndSeconds)}）`;
    }

    if (confirmStartTxt) confirmStartTxt.textContent = formatTime(trimStartSeconds);
    if (confirmEndTxt) confirmEndTxt.textContent = formatTime(trimEndSeconds);
    if (confirmDurTxt) confirmDurTxt.textContent = formatDurationText(trimDurationSeconds);

    if (previewTrimLabel) {
      previewTrimLabel.textContent = `この区間（${formatTime(trimStartSeconds)}〜${formatTime(trimEndSeconds)} / ${formatDurationText(trimDurationSeconds)}）を試聴する`;
    }

    // Update Full Song Preview Timeline labels & range
    if (fullPlayerTotalTime) {
      fullPlayerTotalTime.textContent = formatTime(totalDuration, false);
    }
    if (timelineMidLabel) {
      timelineMidLabel.textContent = formatTime(totalDuration / 2, false);
    }
    if (timelineEndLabel) {
      timelineEndLabel.textContent = `${formatTime(totalDuration, false)} (終了)`;
    }
    if (fullSongSeekSlider) {
      fullSongSeekSlider.max = totalDuration;
    }
    if (timelineSelectionRange) {
      const leftPercent = (trimStartSeconds / totalDuration) * 100;
      const widthPercent = (trimDurationSeconds / totalDuration) * 100;
      timelineSelectionRange.style.left = `${leftPercent}%`;
      timelineSelectionRange.style.width = `${Math.min(100 - leftPercent, widthPercent)}%`;
    }

    // Badges & Summaries
    if (controlTrimRangeBadge) {
      controlTrimRangeBadge.textContent = `再生区間: ${formatTime(trimStartSeconds)} 〜 ${formatTime(trimEndSeconds)} (${formatDurationText(trimDurationSeconds)})`;
    }
    if (exportSummaryTitle) {
      exportSummaryTitle.textContent = `${formatDurationText(trimDurationSeconds)}のリップシンクMVを作成します`;
    }
    if (exportSummaryDesc) {
      exportSummaryDesc.textContent = `開始: ${formatTime(trimStartSeconds)} 〜 終了: ${formatTime(trimEndSeconds)} の動画ファイルが作成されます`;
    }
  }

  // Setters preserving endpoints independence
  function setTrimStart(newStart, preserveEndStrict = false) {
    const totalDuration = audioEngine.duration || 300;
    let s = Math.max(0, Math.round(newStart * 2) / 2);
    if (s >= trimEndSeconds) {
      if (preserveEndStrict) {
        s = Math.max(0, trimEndSeconds - 0.5);
      } else if (s + 0.5 <= totalDuration) {
        trimEndSeconds = Math.round((s + 0.5) * 2) / 2;
      } else {
        s = Math.max(0, trimEndSeconds - 0.5);
      }
    }
    trimStartSeconds = s;
    // Keep End fixed, recalculate duration
    trimDurationSeconds = Math.max(0.5, Math.round((trimEndSeconds - trimStartSeconds) * 10) / 10);
    updateTrimmerUI();
  }

  function setTrimEnd(newEnd, preserveStartStrict = false) {
    const totalDuration = audioEngine.duration || 300;
    let e = Math.min(totalDuration, Math.round(newEnd * 2) / 2);
    if (e <= trimStartSeconds) {
      if (preserveStartStrict) {
        e = Math.min(totalDuration, trimStartSeconds + 0.5);
      } else if (e - 0.5 >= 0) {
        trimStartSeconds = Math.round((e - 0.5) * 2) / 2;
      } else {
        e = trimStartSeconds + 0.5;
      }
    }
    trimEndSeconds = e;
    // Keep Start fixed, recalculate duration
    trimDurationSeconds = Math.max(0.5, Math.round((trimEndSeconds - trimStartSeconds) * 10) / 10);
    updateTrimmerUI();
  }

  function setTrimDuration(newDur) {
    const totalDuration = audioEngine.duration || 300;
    let d = Math.max(0.5, Math.min(60, Math.round(newDur * 2) / 2));
    if (trimStartSeconds + d > totalDuration) {
      d = Math.max(0.5, Math.round((totalDuration - trimStartSeconds) * 2) / 2);
    }
    trimDurationSeconds = d;
    // Start fixed, move End
    trimEndSeconds = Math.round((trimStartSeconds + trimDurationSeconds) * 10) / 10;
    updateTrimmerUI();
  }

  // Start input direct typing (preserve End strictly while typing)
  const onStartInputsChange = (e) => {
    const isInputEvt = e && e.type === 'input';
    if (isInputEvt) {
      if ((trimStartMinInput && document.activeElement === trimStartMinInput && trimStartMinInput.value === '') ||
          (trimStartSecInput && document.activeElement === trimStartSecInput && trimStartSecInput.value === '')) {
        return;
      }
    }
    const min = Math.max(0, parseInt(trimStartMinInput ? trimStartMinInput.value : 0, 10) || 0);
    const sec = Math.max(0, parseFloat(trimStartSecInput ? trimStartSecInput.value : 0) || 0);
    const candidate = min * 60 + sec;
    if (isInputEvt && candidate >= trimEndSeconds) {
      return;
    }
    setTrimStart(candidate, true);
  };
  if (trimStartMinInput) {
    trimStartMinInput.addEventListener('input', onStartInputsChange);
    trimStartMinInput.addEventListener('change', onStartInputsChange);
  }
  if (trimStartSecInput) {
    trimStartSecInput.addEventListener('input', onStartInputsChange);
    trimStartSecInput.addEventListener('change', onStartInputsChange);
  }

  // Steppers for Start Time (0.5s & 1s) - End is LOCKED
  if (startMinus1Btn) {
    startMinus1Btn.addEventListener('click', () => {
      triggerHaptic();
      setTrimStart(trimStartSeconds - 1, true);
    });
  }
  if (startMinusHalfBtn) {
    startMinusHalfBtn.addEventListener('click', () => {
      triggerHaptic();
      setTrimStart(trimStartSeconds - 0.5, true);
    });
  }
  if (startPlusHalfBtn) {
    startPlusHalfBtn.addEventListener('click', () => {
      triggerHaptic();
      setTrimStart(trimStartSeconds + 0.5, true);
    });
  }
  if (startPlus1Btn) {
    startPlus1Btn.addEventListener('click', () => {
      triggerHaptic();
      setTrimStart(trimStartSeconds + 1, true);
    });
  }

  // Duration input & steppers (0.5s & 1s) - Start is LOCKED, End moves
  if (trimDurationInput) {
    const onDurInputChange = (e) => {
      if (e && e.type === 'input' && trimDurationInput.value === '') return;
      const parsed = parseFloat(trimDurationInput.value);
      if (isNaN(parsed) || (e && e.type === 'input' && parsed < 0.5)) return;
      setTrimDuration(Math.max(0.5, parsed));
    };
    trimDurationInput.addEventListener('input', onDurInputChange);
    trimDurationInput.addEventListener('change', onDurInputChange);
  }
  if (durMinus1Btn) {
    durMinus1Btn.addEventListener('click', () => {
      triggerHaptic();
      setTrimDuration(trimDurationSeconds - 1);
    });
  }
  if (durMinusHalfBtn) {
    durMinusHalfBtn.addEventListener('click', () => {
      triggerHaptic();
      setTrimDuration(trimDurationSeconds - 0.5);
    });
  }
  if (durPlusHalfBtn) {
    durPlusHalfBtn.addEventListener('click', () => {
      triggerHaptic();
      setTrimDuration(trimDurationSeconds + 0.5);
    });
  }
  if (durPlus1Btn) {
    durPlus1Btn.addEventListener('click', () => {
      triggerHaptic();
      setTrimDuration(trimDurationSeconds + 1);
    });
  }

  // End position input & steppers (0.5s & 1s) - Start is LOCKED
  const onEndInputsChange = (e) => {
    const isInputEvt = e && e.type === 'input';
    if (isInputEvt) {
      if ((trimEndMinInput && document.activeElement === trimEndMinInput && trimEndMinInput.value === '') ||
          (trimEndSecInput && document.activeElement === trimEndSecInput && trimEndSecInput.value === '')) {
        return;
      }
    }
    const min = Math.max(0, parseInt(trimEndMinInput ? trimEndMinInput.value : 0, 10) || 0);
    const sec = Math.max(0, parseFloat(trimEndSecInput ? trimEndSecInput.value : 0) || 0);
    const candidate = min * 60 + sec;
    if (isInputEvt && candidate <= trimStartSeconds) {
      return;
    }
    setTrimEnd(candidate, true);
  };
  if (trimEndMinInput) {
    trimEndMinInput.addEventListener('input', onEndInputsChange);
    trimEndMinInput.addEventListener('change', onEndInputsChange);
  }
  if (trimEndSecInput) {
    trimEndSecInput.addEventListener('input', onEndInputsChange);
    trimEndSecInput.addEventListener('change', onEndInputsChange);
  }
  if (endMinus1Btn) {
    endMinus1Btn.addEventListener('click', () => {
      triggerHaptic();
      setTrimEnd(trimEndSeconds - 1, true);
    });
  }
  if (endMinusHalfBtn) {
    endMinusHalfBtn.addEventListener('click', () => {
      triggerHaptic();
      setTrimEnd(trimEndSeconds - 0.5, true);
    });
  }
  if (endPlusHalfBtn) {
    endPlusHalfBtn.addEventListener('click', () => {
      triggerHaptic();
      setTrimEnd(trimEndSeconds + 0.5, true);
    });
  }
  if (endPlus1Btn) {
    endPlus1Btn.addEventListener('click', () => {
      triggerHaptic();
      setTrimEnd(trimEndSeconds + 1, true);
    });
  }

  // Trimmer Sliders
  if (trimStartSlider) {
    trimStartSlider.addEventListener('input', (e) => {
      setTrimStart(parseFloat(e.target.value), true);
    });
  }

  if (trimDurationSlider) {
    trimDurationSlider.addEventListener('input', (e) => {
      setTrimDuration(parseFloat(e.target.value));
    });
  }

  // Preset Chips (if present)
  if (trimPresetChips && trimPresetChips.length > 0) {
    trimPresetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        triggerHaptic();
        trimPresetChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        const dur = chip.dataset.dur;
        if (dur === 'full') {
          const totalDuration = audioEngine.duration || 15;
          setTrimDuration(totalDuration - trimStartSeconds);
        } else {
          const parsed = parseFloat(dur);
          if (parsed > 0) setTrimDuration(parsed);
        }
        showToast(`リップシンク動画の長さを「${formatDurationText(trimDurationSeconds)}」にセットしました`);
      });
    });
  }

  // Full Song Preview Player Controls
  function updateFullPlayerUI(isPlaying) {
    if (fullPlayIcon) fullPlayIcon.textContent = isPlaying ? '⏸' : '▶';
    if (fullPlayLabel) fullPlayLabel.textContent = isPlaying ? '一時停止する' : '曲全体を再生する';
    if (fullPlayerStatusBadge) {
      if (isPlaying) {
        fullPlayerStatusBadge.textContent = '再生中 🔊';
        fullPlayerStatusBadge.classList.add('playing');
      } else {
        fullPlayerStatusBadge.textContent = '一時停止中';
        fullPlayerStatusBadge.classList.remove('playing');
      }
    }
  }

  if (fullPlayToggleBtn) {
    fullPlayToggleBtn.addEventListener('click', () => {
      triggerHaptic();
      if (!audioEngine.hasAudioLoaded()) {
        showToast('まず STEP 2 であなたの楽曲ファイルをアップロードしてください');
        return;
      }
      if (audioEngine.isPlaying && audioEngine.playMode === 'full') {
        audioEngine.pause();
        updatePlayUI(false);
        updateFullPlayerUI(false);
      } else {
        const startSec = (audioEngine.currentTime && audioEngine.currentTime < audioEngine.duration - 0.5)
          ? audioEngine.currentTime
          : 0;
        audioEngine.playFull(startSec);
        updatePlayUI(true);
        updateFullPlayerUI(true);
        showToast(`曲全体の再生を開始しました（${formatTime(startSec)}〜）。秒数を確認できます`);
      }
    });
  }

  if (fullPlayRewindBtn) {
    fullPlayRewindBtn.addEventListener('click', () => {
      triggerHaptic();
      if (!audioEngine.hasAudioLoaded()) {
        showToast('まず STEP 2 であなたの楽曲ファイルをアップロードしてください');
        return;
      }
      audioEngine.seekFull(0);
      audioEngine.playFull(0);
      updatePlayUI(true);
      updateFullPlayerUI(true);
      showToast('曲の最初 (00:00) から再生します');
    });
  }

  if (fullSongSeekSlider) {
    fullSongSeekSlider.addEventListener('input', (e) => {
      const targetSec = parseFloat(e.target.value);
      audioEngine.seekFull(targetSec);
      if (fullPlayerCurrentTime) fullPlayerCurrentTime.textContent = formatTime(targetSec, false);
      if (timelinePlayhead) {
        const dur = Math.max(1, audioEngine.duration);
        timelinePlayhead.style.left = `${(targetSec / dur) * 100}%`;
      }
    });
  }

  // ★ The Sync to Start Button
  if (setStartFromCurrentBtn) {
    setStartFromCurrentBtn.addEventListener('click', () => {
      triggerHaptic();
      const cur = audioEngine.currentTime || 0;
      const curSec = Math.round(cur * 2) / 2;
      setTrimStart(curSec, true);
      showToast(`📍 現在の秒数「${formatTime(curSec)}」を開始位置にセットしました！（終了: ${formatTime(trimEndSeconds)}、長さ: ${formatDurationText(trimDurationSeconds)}）`);
    });
  }

  // ★ The Sync to End Button (一発で終了位置を合わせるボタン)
  if (setEndFromCurrentBtn) {
    setEndFromCurrentBtn.addEventListener('click', () => {
      triggerHaptic();
      const cur = audioEngine.currentTime || 0;
      const curSec = Math.round(cur * 2) / 2;
      if (curSec <= trimStartSeconds) {
        showToast('⚠️ 終了位置は歌い出し位置（開始）より後ろで指定してください');
        return;
      }
      setTrimEnd(curSec, true);
      showToast(`🏁 現在の秒数「${formatTime(curSec)}」を終了位置にセットしました！（開始: ${formatTime(trimStartSeconds)}、長さ: ${formatDurationText(trimDurationSeconds)}）`);
    });
  }

  // Test Play Trimmed Section
  previewTrimBtn.addEventListener('click', () => {
    triggerHaptic();
    if (!audioEngine.hasAudioLoaded()) {
      showToast('まず STEP 2 であなたの楽曲ファイルをアップロードしてください');
      return;
    }
    if (audioEngine.isPlaying && audioEngine.playMode === 'trim') {
      audioEngine.pause();
      updatePlayUI(false);
      if (previewTrimIcon) previewTrimIcon.textContent = '▶';
    } else {
      audioEngine.pause();
      audioEngine.pauseOffset = 0;
      audioEngine.playTrim(0);
      updatePlayUI(true);
      updateFullPlayerUI(false);
      if (previewTrimIcon) previewTrimIcon.textContent = '⏸';
      showToast(`▶ 設定区間（${formatTime(trimStartSeconds)} 〜 ${formatTime(trimEndSeconds)} / ${formatDurationText(trimDurationSeconds)}）を試聴中`);
    }
  });

  // ==========================================
  // Screen View Switcher (操作画面 ⇔ MV映像)
  // ==========================================
  function switchView(target) {
    triggerHaptic();
    if (target === 'controls') {
      const alreadyControls = viewControls.classList.contains('active-view');
      viewControls.classList.add('active-view');
      viewStage.classList.add('hidden');
      tabBtnControls.classList.add('active');
      tabBtnControls.setAttribute('aria-selected', 'true');
      tabBtnStage.classList.remove('active');
      tabBtnStage.setAttribute('aria-selected', 'false');

      if (tabControlsSub) tabControlsSub.textContent = '✔ 現在表示中';
      if (tabStageSub) tabStageSub.textContent = '完成動画を見る →';

      window.scrollTo({ top: 0, behavior: 'smooth' });

      // アニメーション効果で押した反応を明示
      tabBtnControls.classList.remove('pulse-anim');
      void tabBtnControls.offsetWidth; // reflow
      tabBtnControls.classList.add('pulse-anim');

      if (alreadyControls) {
        showToast('✅ すでに「操作画面」を表示しています（下へスクロールして設定できます）');
      } else {
        showToast('🎛️ 操作画面に戻りました');
      }
    } else {
      viewControls.classList.remove('active-view');
      viewStage.classList.remove('hidden');
      tabBtnControls.classList.remove('active');
      tabBtnControls.setAttribute('aria-selected', 'false');
      tabBtnStage.classList.add('active');
      tabBtnStage.setAttribute('aria-selected', 'true');

      if (tabControlsSub) tabControlsSub.textContent = '設定に戻る ←';
      if (tabStageSub) tabStageSub.textContent = '✔ 現在表示中';

      tabBtnStage.classList.remove('pulse-anim');
      void tabBtnStage.offsetWidth;
      tabBtnStage.classList.add('pulse-anim');

      if (!audioEngine.isPlaying && audioEngine.hasAudioLoaded()) {
        audioEngine.play();
        updatePlayUI(true);
      }
      showToast('🎬 MV映像を全画面表示しました');
    }
  }

  tabBtnControls.addEventListener('click', () => switchView('controls'));
  tabBtnStage.addEventListener('click', () => switchView('stage'));
  jumpToStageBtn.addEventListener('click', () => switchView('stage'));
  backToControlsBtn.addEventListener('click', () => switchView('controls'));

  // ==========================================
  // Super Large Mode (文字・ボタン超特大モード)
  // 視力に不安のあるユーザー向け拡大トグル
  // ==========================================
  function setZoomHuge(enable, showFeedback = true) {
    if (enable) {
      document.body.classList.add('zoom-huge');
      if (zoomBtnText) zoomBtnText.textContent = '文字・ボタンを標準サイズに戻す';
      if (zoomStatusBadge) {
        zoomStatusBadge.textContent = '特大ON';
        zoomStatusBadge.classList.add('active');
      }
      if (zoomToggleBtn) zoomToggleBtn.classList.add('active');
      try { localStorage.setItem('groove_zoom_huge', 'true'); } catch (e) {}
      if (showFeedback) {
        triggerHaptic();
        showToast('🔍 文字とボタンを特大サイズに拡大しました！');
      }
    } else {
      document.body.classList.remove('zoom-huge');
      if (zoomBtnText) zoomBtnText.textContent = '文字・ボタンを特大にする';
      if (zoomStatusBadge) {
        zoomStatusBadge.textContent = '標準';
        zoomStatusBadge.classList.remove('active');
      }
      if (zoomToggleBtn) zoomToggleBtn.classList.remove('active');
      try { localStorage.setItem('groove_zoom_huge', 'false'); } catch (e) {}
      if (showFeedback) {
        triggerHaptic();
        showToast('文字・ボタンを標準サイズに戻しました');
      }
    }
  }

  if (zoomToggleBtn) {
    zoomToggleBtn.addEventListener('click', () => {
      const isCurrentlyHuge = document.body.classList.contains('zoom-huge');
      setZoomHuge(!isCurrentlyHuge, true);
    });
  }

  // 保存設定の自動復元
  try {
    const savedZoom = localStorage.getItem('groove_zoom_huge');
    if (savedZoom === 'true') {
      setZoomHuge(true, false);
    }
  } catch (e) {}

  // App Reload Button (For home screen PWA & mobile cache refresh)
  const appReloadBtn = document.getElementById('appReloadBtn');
  if (appReloadBtn) {
    appReloadBtn.addEventListener('click', () => {
      triggerHaptic();
      const verSpan = document.getElementById('headerVersionLabel');
      const currentVerText = verSpan && verSpan.textContent ? verSpan.textContent.trim() : '最新版 (v16.0)';
      if (verSpan) {
        verSpan.textContent = '更新中...';
      }
      showToast(`🔄 ${currentVerText} を読み込んで更新しています...`);
      setTimeout(() => {
        try {
          const url = new URL(window.location.href);
          // If viewing old subpages like v11-b.html or v11-a.html, ensure it points to index.html
          if (url.pathname.endsWith('v11-b.html') || url.pathname.endsWith('v11-a.html')) {
            url.pathname = url.pathname.replace(/v11-[ab]\.html$/, 'index.html');
          }
          url.searchParams.set('v', Date.now().toString());
          window.location.replace(url.toString());
        } catch (e) {
          window.location.reload();
        }
      }, 250);
    });
  }

  // ==========================================
  // Playback Control
  // ==========================================
  function updatePlayUI(playing) {
    if (playing) {
      if (mainPlayIcon) mainPlayIcon.textContent = '⏸';
      if (mainPlayText) mainPlayText.textContent = '音楽を一時停止';
      if (stagePlayIcon) stagePlayIcon.textContent = '⏸';
    } else {
      if (mainPlayIcon) mainPlayIcon.textContent = '▶';
      if (mainPlayText) mainPlayText.textContent = '音楽を再生する';
      if (stagePlayIcon) stagePlayIcon.textContent = '▶';
      if (previewTrimIcon) previewTrimIcon.textContent = '▶';
    }
  }

  function togglePlay() {
    triggerHaptic();
    if (!audioEngine.hasAudioLoaded()) {
      showToast('まず STEP 2 であなたのオリジナル楽曲をアップロードしてください');
      return;
    }
    if (audioEngine.isPlaying) {
      audioEngine.pause();
      updatePlayUI(false);
      updateFullPlayerUI(false);
    } else {
      audioEngine.pauseOffset = 0;
      audioEngine.playTrim(0);
      updatePlayUI(true);
      updateFullPlayerUI(false);
    }
  }

  if (mainPlayBtn) mainPlayBtn.addEventListener('click', togglePlay);
  if (stagePlayBtn) stagePlayBtn.addEventListener('click', togglePlay);

  if (stageProgressWrap) {
    stageProgressWrap.addEventListener('click', (e) => {
      const rect = stageProgressWrap.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audioEngine.seek(ratio);
    });
  }

  // ==========================================
  // User Photo Avatar Upload & State Management
  // ==========================================
  function applyCustomAvatar(canvas, filename) {
    characterRenderer.setCustomAvatar(canvas);

    const previewDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    if (avatarPreviewImg) {
      avatarPreviewImg.src = previewDataUrl;
      avatarPreviewImg.classList.remove('hidden');
    }
    if (avatarCardIcon) {
      avatarCardIcon.classList.add('hidden');
    }

    avatarUploadBtn.classList.add('applied');
    avatarCardTitle.textContent = `✔ あなたの写真がセットされています`;
    avatarCardHint.textContent = `${filename || '人物写真'} (${canvas.width}×${canvas.height}) — タップで別の写真に変更`;

    if (customAvatarBanner) {
      customAvatarBanner.classList.remove('hidden');
      if (customAvatarStatusTitle) {
        customAvatarStatusTitle.textContent = `あなたの写真がセットされました！`;
      }
      if (customAvatarStatusSub) {
        customAvatarStatusSub.textContent = `続けて STEP 2・3 で楽曲と歌わせる秒数を指定し、STEP 4 で完成動画サイズを選んでください`;
      }
    }
    if (typeof updateSizeFramingPreview === 'function') {
      updateSizeFramingPreview();
    }
  }

  if (changeAvatarBtn) {
    changeAvatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerHaptic();
      avatarFileInput.click();
    });
  }

  // ==========================================
  // v12 (Fal.ai Unified API): Full AI Lip-Sync & Singing Video Studio
  // ==========================================
  const aiSettingsModal = document.getElementById('aiSettingsModal');
  const openAiSettingsBtn = document.getElementById('openAiSettingsBtn');
  const closeAiSettingsBtn = document.getElementById('closeAiSettingsBtn');
  const closeAiSettingsBottomBtn = document.getElementById('closeAiSettingsBottomBtn');
  const saveAiSettingsBtn = document.getElementById('saveAiSettingsBtn');

  const falApiKeyInput = document.getElementById('falApiKeyInput');
  const inlineFalApiKeyInput = document.getElementById('inlineFalApiKeyInput');
  const saveInlineApiKeyBtn = document.getElementById('saveInlineApiKeyBtn');
  const pasteAndSaveApiKeyBtn = document.getElementById('pasteAndSaveApiKeyBtn');
  const toggleKeyVisibilityBtn = document.getElementById('toggleKeyVisibilityBtn');
  const statusKeyFal = document.getElementById('statusKeyFal');
  const aiGenStatusBox = document.getElementById('aiGenStatusBox');

  const generateAiLipsyncBtn = document.getElementById('generateAiLipsyncBtn');
  const aiVideoPromptInput = document.getElementById('aiVideoPromptInput');
  const aiVideoFileInput = document.getElementById('aiVideoFileInput');

  const aiResultCard = document.getElementById('aiResultCard');
  const inlineAiResultVideo = document.getElementById('inlineAiResultVideo');
  const saveAiResultToPhotosBtn = document.getElementById('saveAiResultToPhotosBtn');
  const downloadAiResultMp4Btn = document.getElementById('downloadAiResultMp4Btn');

  // v12.4 Material Mode & Video Pattern Elements
  const tabModePhoto = document.getElementById('tabModePhoto');
  const tabModeVideo = document.getElementById('tabModeVideo');
  const materialPhotoBox = document.getElementById('materialPhotoBox');
  const materialVideoBox = document.getElementById('materialVideoBox');
  const videoMaterialUploadBtn = document.getElementById('videoMaterialUploadBtn');
  const videoMaterialFileInput = document.getElementById('videoMaterialFileInput');
  const videoMaterialCardTitle = document.getElementById('videoMaterialCardTitle');
  const videoMaterialCardHint = document.getElementById('videoMaterialCardHint');
  const videoPatternSection = document.getElementById('videoPatternSection');
  const sourceVideoPlayer = document.getElementById('sourceVideoPlayer');
  const sourceVideoDurationLabel = document.getElementById('sourceVideoDurationLabel');
  const patternBtnA = document.getElementById('patternBtnA');
  const patternBtnB = document.getElementById('patternBtnB');
  const patternPillA = document.getElementById('patternPillA');
  const patternPillB = document.getElementById('patternPillB');
  const patternBFrameBox = document.getElementById('patternBFrameBox');
  const captureVideoFrameBtn = document.getElementById('captureVideoFrameBtn');
  const capturedFramePreviewRow = document.getElementById('capturedFramePreviewRow');
  const capturedFrameThumb = document.getElementById('capturedFrameThumb');
  const capturedFrameTimeBadge = document.getElementById('capturedFrameTimeBadge');
  const changeVideoMaterialBtn = document.getElementById('changeVideoMaterialBtn');
  const photoModelsGroup = document.getElementById('photoModelsGroup');
  const videoModelsGroup = document.getElementById('videoModelsGroup');
  const aiPromptStyleWrap = document.getElementById('aiPromptStyleWrap');
  const currentMaterialIndicatorBadge = document.getElementById('currentMaterialIndicatorBadge');
  const step4Subtitle = document.getElementById('step4Subtitle');

  // v12.5 Output Video Size & Framing Elements
  const selectedSizeSummaryBadge = document.getElementById('selectedSizeSummaryBadge');
  const fitModeSubBox = document.getElementById('fitModeSubBox');
  const sizeFramingPreviewCanvas = document.getElementById('sizeFramingPreviewCanvas');
  const sizeFramingPreviewTitle = document.getElementById('sizeFramingPreviewTitle');
  const sizeFramingPreviewSub = document.getElementById('sizeFramingPreviewSub');

  let activeMaterialMode = 'photo'; // 'photo' | 'video'
  let activeVideoPattern = 'A'; // 'A' (video-to-video) | 'B' (frame capture)
  let uploadedVideoMaterialFile = null;
  let uploadedVideoMaterialUrl = null;
  let capturedVideoFrameCanvas = null;

  let selectedOutputVideoSize = '9:16'; // '9:16' | '16:9' | '1:1' | 'original'
  let selectedOutputFitMode = 'cover';  // 'cover' | 'contain_blur'
  let selectedOutputResolution = '720p'; // '720p' | '1080p'

  // v15.0: 最新世代 OmniHuman 2.0 & Kling 4.0 & 顔崩壊（妖怪化）防止エンジン
  let enableVocalSeparation = true; // default ON (Demucs vocal isolation + original audio merge)
  let enableIdentityLock = true;    // default ON (Gentle audio gain + anti-grimace prompt protection)
  let selectedHybridStage2Model = 'fal-ai/sync-lipsync/v3';
  let selectedHybridStage2Label = 'Sync Lipsync v3';

  let selectedV11bModel = 'fal-ai/sync-lipsync/v3';
  let selectedV11bMode = 'photolock_v2v';
  let selectedV11bLabel = '🔒 Sync-3 Video Lips-Only (顔生成ゼロ・元写真100%固定)';
  let selectedAiPromptStyle = 'sway';

  // --- 5-Layer Persistent Key Vault (Safari + iOS Home Screen Web App) ---
  function setKeyCookie(val) {
    try {
      const encoded = encodeURIComponent(val || '');
      document.cookie = `gs_fal_api_key=${encoded}; path=/; max-age=315360000; SameSite=Lax`;
    } catch (e) {}
  }

  function getKeyCookie() {
    try {
      const match = document.cookie.match(/(?:^|;\s*)gs_fal_api_key=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : '';
    } catch (e) {
      return '';
    }
  }

  function setKeyUrlHash(val) {
    try {
      const url = new URL(window.location.href);
      if (val) {
        url.hash = `gs_key=${encodeURIComponent(btoa(unescape(encodeURIComponent(val))))}`;
      } else if (url.hash.includes('gs_key=')) {
        url.hash = '';
      }
      window.history.replaceState(null, '', url.toString());
    } catch (e) {}
  }

  function getKeyFromUrlHash() {
    try {
      const hash = window.location.hash || '';
      const match = hash.match(/gs_key=([^&]+)/);
      if (match && match[1]) {
        return decodeURIComponent(escape(atob(decodeURIComponent(match[1]))));
      }
    } catch (e) {}
    return '';
  }

  async function saveKeyToVaultAsync(val) {
    // CacheStorage backup
    try {
      if ('caches' in window) {
        const cache = await caches.open('gs-key-vault-v1');
        await cache.put('/__gs_fal_key__', new Response(val || '', { headers: { 'Content-Type': 'text/plain' } }));
      }
    } catch (e) {}

    // IndexedDB backup
    try {
      if ('indexedDB' in window) {
        const req = indexedDB.open('GrooveSyncVaultDB', 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('keys')) {
            db.createObjectStore('keys');
          }
        };
        req.onsuccess = () => {
          try {
            const db = req.result;
            const tx = db.transaction('keys', 'readwrite');
            tx.objectStore('keys').put(val || '', 'gs_fal_api_key');
          } catch (e) {}
        };
      }
    } catch (e) {}
  }

  async function restoreKeyFromVaultAsync() {
    let found = '';
    // 1. Try CacheStorage
    try {
      if ('caches' in window) {
        const cache = await caches.open('gs-key-vault-v1');
        const resp = await cache.match('/__gs_fal_key__');
        if (resp) {
          const txt = (await resp.text()).trim();
          if (txt) found = txt;
        }
      }
    } catch (e) {}

    // 2. Try IndexedDB
    if (!found) {
      try {
        if ('indexedDB' in window) {
          found = await new Promise((resolve) => {
            const req = indexedDB.open('GrooveSyncVaultDB', 1);
            req.onupgradeneeded = () => {
              const db = req.result;
              if (!db.objectStoreNames.contains('keys')) {
                db.createObjectStore('keys');
              }
            };
            req.onsuccess = () => {
              try {
                const db = req.result;
                const tx = db.transaction('keys', 'readonly');
                const getReq = tx.objectStore('keys').get('gs_fal_api_key');
                getReq.onsuccess = () => resolve((getReq.result || '').trim());
                getReq.onerror = () => resolve('');
              } catch (e) {
                resolve('');
              }
            };
            req.onerror = () => resolve('');
          });
        }
      } catch (e) {}
    }

    if (found) {
      try { localStorage.setItem('gs_fal_api_key', found); } catch (e) {}
      try { sessionStorage.setItem('gs_fal_api_key', found); } catch (e) {}
      setKeyCookie(found);
      setKeyUrlHash(found);
      refreshApiKeyStatusBadges();
    }
  }

  function sanitizeFalApiKey(raw) {
    return (raw || '')
      .trim()
      .replace(/^["']+|["']+$/g, '')
      .replace(/^(?:Key|Bearer)\s+/i, '')
      .trim();
  }

  function getSavedFalApiKey() {
    let key = '';
    try { key = sanitizeFalApiKey(localStorage.getItem('gs_fal_api_key')); } catch (e) {}
    if (!key) {
      try { key = sanitizeFalApiKey(sessionStorage.getItem('gs_fal_api_key')); } catch (e) {}
    }
    if (!key) {
      key = sanitizeFalApiKey(getKeyCookie());
    }
    if (!key) {
      key = sanitizeFalApiKey(getKeyFromUrlHash());
    }
    if (key) {
      try { localStorage.setItem('gs_fal_api_key', key); } catch (e) {}
      try { sessionStorage.setItem('gs_fal_api_key', key); } catch (e) {}
      setKeyCookie(key);
    }
    return key;
  }

  function refreshApiKeyStatusBadges() {
    const falKey = getSavedFalApiKey();
    if (inlineFalApiKeyInput && document.activeElement !== inlineFalApiKeyInput) {
      inlineFalApiKeyInput.value = falKey;
    }
    if (falApiKeyInput && document.activeElement !== falApiKeyInput) {
      falApiKeyInput.value = falKey;
    }
    if (statusKeyFal) {
      if (falKey) {
        const masked = falKey.length > 10 ? `${falKey.slice(0, 6)}...${falKey.slice(-4)}` : '登録済';
        statusKeyFal.textContent = `🟢 登録済み（${masked} / ホーム画面＆iPhoneに5重記憶済）`;
        statusKeyFal.style.background = 'rgba(16, 185, 129, 0.25)';
        statusKeyFal.style.color = '#6ee7b7';
      } else {
        statusKeyFal.textContent = '⚠️ 未登録（下のボタンで貼り付けて保存してください）';
        statusKeyFal.style.background = 'rgba(255, 255, 255, 0.12)';
        statusKeyFal.style.color = '#fde047';
      }
    }
  }

  function saveFalApiKey(rawKey) {
    const val = sanitizeFalApiKey(rawKey);
    if (val) {
      try { localStorage.setItem('gs_fal_api_key', val); } catch (e) {}
      try { sessionStorage.setItem('gs_fal_api_key', val); } catch (e) {}
      setKeyCookie(val);
      setKeyUrlHash(val);
      saveKeyToVaultAsync(val);
      refreshApiKeyStatusBadges();
      showToast('✔ APIキーをiPhone＆ホーム画面用に5重記憶しました！');
      return true;
    } else {
      try { localStorage.removeItem('gs_fal_api_key'); } catch (e) {}
      try { sessionStorage.removeItem('gs_fal_api_key'); } catch (e) {}
      setKeyCookie('');
      setKeyUrlHash('');
      saveKeyToVaultAsync('');
      refreshApiKeyStatusBadges();
      showToast('APIキーを消去しました');
      return false;
    }
  }

  if (toggleKeyVisibilityBtn && inlineFalApiKeyInput) {
    toggleKeyVisibilityBtn.addEventListener('click', () => {
      triggerHaptic();
      if (inlineFalApiKeyInput.type === 'password') {
        inlineFalApiKeyInput.type = 'text';
        toggleKeyVisibilityBtn.innerHTML = '<span>🙈 隠す</span>';
      } else {
        inlineFalApiKeyInput.type = 'password';
        toggleKeyVisibilityBtn.innerHTML = '<span>👁 表示</span>';
      }
    });
  }

  if (pasteAndSaveApiKeyBtn) {
    pasteAndSaveApiKeyBtn.addEventListener('click', async () => {
      triggerHaptic();
      try {
        if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
          const clipText = (await navigator.clipboard.readText() || '').trim();
          if (clipText) {
            if (inlineFalApiKeyInput) inlineFalApiKeyInput.value = clipText;
            saveFalApiKey(clipText);
            return;
          }
        }
      } catch (e) {
        console.warn('Clipboard read requires manual paste on iOS:', e);
      }
      if (inlineFalApiKeyInput && inlineFalApiKeyInput.value.trim()) {
        saveFalApiKey(inlineFalApiKeyInput.value.trim());
      } else {
        if (inlineFalApiKeyInput) inlineFalApiKeyInput.focus();
        showToast('入力欄を長押しして「ペースト」を押し、保存ボタンを押してください');
      }
    });
  }

  if (inlineFalApiKeyInput) {
    inlineFalApiKeyInput.addEventListener('input', () => {
      const val = inlineFalApiKeyInput.value.trim();
      if (val.length >= 16 && val.includes(':')) {
        // Auto-save immediately when a valid Fal.ai key format (xxxx:yyyy) is pasted!
        saveFalApiKey(val);
      }
    });
    inlineFalApiKeyInput.addEventListener('change', () => {
      const val = inlineFalApiKeyInput.value.trim();
      if (val) saveFalApiKey(val);
    });
  }

  if (saveInlineApiKeyBtn) {
    saveInlineApiKeyBtn.addEventListener('click', () => {
      triggerHaptic();
      const val = inlineFalApiKeyInput ? inlineFalApiKeyInput.value : '';
      if (!val.trim()) {
        showToast('⚠️ Fal.ai でコピーしたAPIキーを入力欄に貼り付けてください');
        if (inlineFalApiKeyInput) inlineFalApiKeyInput.focus();
        return;
      }
      saveFalApiKey(val);
    });
  }

  // Restore from IndexedDB / CacheStorage on startup if needed
  restoreKeyFromVaultAsync();

  function showAiStatus(msg, borderColor = '#38bdf8') {
    if (!aiGenStatusBox) return;
    aiGenStatusBox.innerHTML = msg;
    aiGenStatusBox.style.borderColor = borderColor;
    aiGenStatusBox.classList.remove('hidden');
  }

  // Centralized Single-Selection Function for AI Model Buttons (guarantees only 1 model is selected across the entire page)
  function selectAiModelButton(targetBtn, showFeedback = true) {
    if (!targetBtn) return;
    document.querySelectorAll('.v11b-model-btn').forEach(b => {
      b.classList.remove('active');
      b.style.background = '';
      b.style.borderColor = '';
      const pill = b.querySelector('.v11b-model-pill');
      if (pill) {
        pill.textContent = 'タップで選択';
        pill.style.background = '';
        pill.style.color = '';
      }
    });

    targetBtn.classList.add('active');
    const activePill = targetBtn.querySelector('.v11b-model-pill');
    if (activePill) {
      activePill.textContent = '✔ 選択中';
      activePill.style.background = '';
      activePill.style.color = '';
    }

    selectedV11bModel = targetBtn.dataset.model || 'fal-ai/sync-lipsync/v3';
    selectedV11bMode = targetBtn.dataset.mode || 'photolock_v2v';
    selectedV11bLabel = targetBtn.dataset.label || '🔒 Sync-3 Video Lips-Only (顔生成ゼロ・元写真100%固定)';

    // Toggle Hybrid Stage 2 sub-selector visibility
    const hybridStage2SelectorBox = document.getElementById('hybridStage2SelectorBox');
    if (hybridStage2SelectorBox) {
      if (selectedV11bMode === 'hybrid_lipsync') {
        hybridStage2SelectorBox.classList.remove('hidden');
      } else {
        hybridStage2SelectorBox.classList.add('hidden');
      }
    }

    // Dim vocal separation card only when motion-only video mode is selected
    const vocalSeparationCard = document.getElementById('vocalSeparationCard');
    if (vocalSeparationCard) {
      vocalSeparationCard.style.opacity = (selectedV11bMode === 'video') ? '0.55' : '1';
    }

    const supportsPrompt = targetBtn.dataset.supportsPrompt !== 'false';
    const promptUnsupportedNotice = document.getElementById('promptUnsupportedNotice');
    const promptStyleButtonsBox = document.getElementById('promptStyleButtonsBox');
    if (promptUnsupportedNotice) {
      if (!supportsPrompt && selectedV11bMode !== 'videolipsync') {
        promptUnsupportedNotice.classList.remove('hidden');
      } else {
        promptUnsupportedNotice.classList.add('hidden');
      }
    }
    if (promptStyleButtonsBox) {
      promptStyleButtonsBox.style.opacity = (!supportsPrompt && selectedV11bMode !== 'videolipsync') ? '0.45' : '1';
    }
    if (aiVideoPromptInput) {
      aiVideoPromptInput.style.opacity = (!supportsPrompt && selectedV11bMode !== 'videolipsync') ? '0.45' : '1';
    }

    if (showFeedback) {
      showToast(`🎤 「${selectedV11bLabel}」を選択しました`);
    }
  }

  // Model selection in STEP 4 (strictly 1 active model at a time)
  document.querySelectorAll('.v11b-model-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic();
      selectAiModelButton(btn, true);
    });
  });

  // v14.0: 改善B (AI Vocal Separation ON/OFF toggle)
  const vocalSepBtns = document.querySelectorAll('.vocal-sep-btn');
  const vocalSepStatusBadge = document.getElementById('vocalSepStatusBadge');
  vocalSepBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic();
      vocalSepBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      enableVocalSeparation = (btn.dataset.sep === 'on');
      if (vocalSepStatusBadge) {
        if (enableVocalSeparation) {
          vocalSepStatusBadge.textContent = '✨ ON：自動分離する（推奨）';
          vocalSepStatusBadge.style.background = 'rgba(16, 185, 129, 0.3)';
          vocalSepStatusBadge.style.borderColor = '#34d399';
          vocalSepStatusBadge.style.color = '#ecfdf5';
        } else {
          vocalSepStatusBadge.textContent = '🎵 OFF：原曲のまま口パク';
          vocalSepStatusBadge.style.background = 'rgba(148, 163, 184, 0.25)';
          vocalSepStatusBadge.style.borderColor = '#94a3b8';
          vocalSepStatusBadge.style.color = '#e2e8f0';
        }
      }
      showToast(enableVocalSeparation
        ? '🎙️ 改善B：AIボーカル自動分離を「ON」にしました（推奨）'
        : '🎵 改善B：AIボーカル自動分離を「OFF」にしました');
    });
  });

  // v14.1: 🔒 Character Face & Art Style 100% Lock ON/OFF toggle
  const identityLockBtns = document.querySelectorAll('.identity-lock-btn');
  const identityLockStatusBadge = document.getElementById('identityLockStatusBadge');
  identityLockBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic();
      identityLockBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      enableIdentityLock = (btn.dataset.lock === 'on');
      if (identityLockStatusBadge) {
        if (enableIdentityLock) {
          identityLockStatusBadge.textContent = '🔒 ON：元写真の顔100%固定（必須推奨）';
          identityLockStatusBadge.style.background = 'rgba(217, 70, 239, 0.35)';
          identityLockStatusBadge.style.borderColor = '#f0abfc';
          identityLockStatusBadge.style.color = '#fdf4ff';
        } else {
          identityLockStatusBadge.textContent = '🔓 OFF：保護ロックなし';
          identityLockStatusBadge.style.background = 'rgba(148, 163, 184, 0.25)';
          identityLockStatusBadge.style.borderColor = '#94a3b8';
          identityLockStatusBadge.style.color = '#e2e8f0';
        }
      }
      showToast(enableIdentityLock
        ? '🔒 「別人化ゼロ」元写真100%顔固定・口唇限定ロックを「ON」にしました'
        : '🔓 顔固定ロックを「OFF」にしました');
    });
  });

  // v14.0: 改善A (Hybrid Stage 2 Lip-Sync Engine Selector)
  const hybridStage2Btns = document.querySelectorAll('.hybrid-stage2-btn');
  hybridStage2Btns.forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic();
      hybridStage2Btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedHybridStage2Model = btn.dataset.stage2Model || 'fal-ai/sync-lipsync/v3';
      selectedHybridStage2Label = btn.dataset.stage2Label || 'Sync Lipsync v3';
      showToast(`🔗 第2段階の口パクAIを「${selectedHybridStage2Label}」に設定しました`);
    });
  });

  // Material Mode & Video Pattern Controllers (v12.4)
  function setMaterialMode(mode) {
    activeMaterialMode = mode;
    triggerHaptic();
    if (mode === 'photo') {
      if (tabModePhoto) {
        tabModePhoto.classList.add('active');
        tabModePhoto.style.background = '';
        tabModePhoto.style.borderColor = '';
      }
      if (tabModeVideo) {
        tabModeVideo.classList.remove('active');
        tabModeVideo.style.background = '';
        tabModeVideo.style.borderColor = '';
      }
      if (materialPhotoBox) materialPhotoBox.classList.remove('hidden');
      if (materialVideoBox) materialVideoBox.classList.add('hidden');

      if (photoModelsGroup) photoModelsGroup.classList.remove('hidden');
      if (videoModelsGroup) videoModelsGroup.classList.add('hidden');
      if (aiPromptStyleWrap) aiPromptStyleWrap.classList.remove('hidden');
      if (currentMaterialIndicatorBadge) {
        currentMaterialIndicatorBadge.textContent = '📷 写真モード';
        currentMaterialIndicatorBadge.style.background = 'rgba(168, 85, 247, 0.35)';
        currentMaterialIndicatorBadge.style.borderColor = '#c084fc';
        currentMaterialIndicatorBadge.style.color = '#f0abfc';
      }
      if (generateAiLipsyncBtn) {
        generateAiLipsyncBtn.innerHTML = '<span>✨ APIでAIリップシンク歌唱動画を生成する</span>';
      }

      // Restore user's uploaded photo if they previously uploaded one
      if (savedCustomAvatarCanvas) {
        applyCustomAvatar(savedCustomAvatarCanvas, savedCustomAvatarName);
      }

      const currentPhotoBtn = photoModelsGroup
        ? (photoModelsGroup.querySelector('.v11b-model-btn.active') || photoModelsGroup.querySelector('.v11b-model-btn'))
        : null;
      if (currentPhotoBtn) {
        selectAiModelButton(currentPhotoBtn, false);
      }
      showToast('📷 「写真・画像」モードに切り替えました');
    } else {
      if (tabModeVideo) {
        tabModeVideo.classList.add('active');
        tabModeVideo.style.background = '';
        tabModeVideo.style.borderColor = '';
      }
      if (tabModePhoto) {
        tabModePhoto.classList.remove('active');
        tabModePhoto.style.background = '';
        tabModePhoto.style.borderColor = '';
      }
      if (materialVideoBox) materialVideoBox.classList.remove('hidden');
      if (materialPhotoBox) materialPhotoBox.classList.add('hidden');

      updateVideoPatternUI();
      showToast('🎬 「動画素材」モードに切り替えました');
    }
  }

  function setVideoPattern(pattern) {
    activeVideoPattern = pattern;
    triggerHaptic();
    updateVideoPatternUI();
  }

  function updateVideoPatternUI() {
    if (activeMaterialMode !== 'video') return;

    if (activeVideoPattern === 'A') {
      if (patternBtnA) {
        patternBtnA.classList.add('active');
        patternBtnA.style.background = '';
        patternBtnA.style.borderColor = '';
      }
      if (patternPillA) {
        patternPillA.textContent = '✔ 選択中';
        patternPillA.style.background = '';
        patternPillA.style.color = '';
      }
      if (patternBtnB) {
        patternBtnB.classList.remove('active');
        patternBtnB.style.background = '';
        patternBtnB.style.borderColor = '';
      }
      if (patternPillB) {
        patternPillB.textContent = 'タップで選択';
        patternPillB.style.background = '';
        patternPillB.style.color = '';
      }
      if (patternBFrameBox) patternBFrameBox.classList.add('hidden');

      if (videoModelsGroup) videoModelsGroup.classList.remove('hidden');
      if (photoModelsGroup) photoModelsGroup.classList.add('hidden');
      if (aiPromptStyleWrap) aiPromptStyleWrap.classList.add('hidden');
      if (currentMaterialIndicatorBadge) {
        currentMaterialIndicatorBadge.textContent = '🎬 動画モード（パターン①: 動画リップシンク）';
        currentMaterialIndicatorBadge.style.background = 'rgba(16, 185, 129, 0.25)';
        currentMaterialIndicatorBadge.style.borderColor = '#10b981';
        currentMaterialIndicatorBadge.style.color = '#6ee7b7';
      }
      if (generateAiLipsyncBtn) {
        generateAiLipsyncBtn.innerHTML = '<span>✨ APIで動画の口元をリップシンク生成する</span>';
      }

      const currentVidBtn = videoModelsGroup
        ? (videoModelsGroup.querySelector('.v11b-model-btn.active') || videoModelsGroup.querySelector('.v11b-model-btn'))
        : null;
      if (currentVidBtn) {
        selectAiModelButton(currentVidBtn, false);
      }
    } else {
      if (patternBtnB) {
        patternBtnB.classList.add('active');
        patternBtnB.style.background = '';
        patternBtnB.style.borderColor = '';
      }
      if (patternPillB) {
        patternPillB.textContent = '✔ 選択中';
        patternPillB.style.background = '';
        patternPillB.style.color = '';
      }
      if (patternBtnA) {
        patternBtnA.classList.remove('active');
        patternBtnA.style.background = '';
        patternBtnA.style.borderColor = '';
      }
      if (patternPillA) {
        patternPillA.textContent = 'タップで選択';
        patternPillA.style.background = '';
        patternPillA.style.color = '';
      }
      if (patternBFrameBox) patternBFrameBox.classList.remove('hidden');

      if (photoModelsGroup) photoModelsGroup.classList.remove('hidden');
      if (videoModelsGroup) videoModelsGroup.classList.add('hidden');
      if (aiPromptStyleWrap) aiPromptStyleWrap.classList.remove('hidden');
      if (currentMaterialIndicatorBadge) {
        currentMaterialIndicatorBadge.textContent = '📸 動画モード（パターン②: 1コマ切り出し歌唱）';
        currentMaterialIndicatorBadge.style.background = 'rgba(56, 189, 248, 0.25)';
        currentMaterialIndicatorBadge.style.borderColor = '#38bdf8';
        currentMaterialIndicatorBadge.style.color = '#7dd3fc';
      }
      if (generateAiLipsyncBtn) {
        generateAiLipsyncBtn.innerHTML = '<span>✨ APIでAIリップシンク歌唱動画を生成する</span>';
      }

      const currentPhotoBtn = photoModelsGroup
        ? (photoModelsGroup.querySelector('.v11b-model-btn.active') || photoModelsGroup.querySelector('.v11b-model-btn'))
        : null;
      if (currentPhotoBtn) {
        selectAiModelButton(currentPhotoBtn, false);
      }
    }
    if (typeof updateSizeFramingPreview === 'function') {
      updateSizeFramingPreview();
    }
  }

  function captureFrameFromSourceVideo() {
    if (!sourceVideoPlayer || !sourceVideoPlayer.videoWidth || !sourceVideoPlayer.videoHeight) {
      return null;
    }
    const vw = sourceVideoPlayer.videoWidth;
    const vh = sourceVideoPlayer.videoHeight;
    const maxDim = 1280;
    let targetW = vw;
    let targetH = vh;
    if (vw > maxDim || vh > maxDim) {
      if (vw > vh) {
        targetW = maxDim;
        targetH = Math.round((vh * maxDim) / vw);
      } else {
        targetH = maxDim;
        targetW = Math.round((vw * maxDim) / vh);
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceVideoPlayer, 0, 0, targetW, targetH);
    capturedVideoFrameCanvas = canvas;

    characterRenderer.setCustomAvatar(canvas);

    if (capturedFrameThumb) {
      try {
        capturedFrameThumb.src = canvas.toDataURL('image/jpeg', 0.85);
      } catch (e) {}
    }
    if (capturedFrameTimeBadge) {
      const curSec = sourceVideoPlayer.currentTime || 0;
      capturedFrameTimeBadge.textContent = `切り出し位置: ${formatTime(curSec)} (${vw}×${vh})`;
    }
    if (capturedFramePreviewRow) {
      capturedFramePreviewRow.classList.remove('hidden');
    }
    if (typeof updateSizeFramingPreview === 'function') {
      updateSizeFramingPreview();
    }
    return canvas;
  }

  if (tabModePhoto) {
    tabModePhoto.addEventListener('click', () => {
      setMaterialMode('photo');
      if (typeof updateSizeFramingPreview === 'function') updateSizeFramingPreview();
    });
  }
  if (tabModeVideo) {
    tabModeVideo.addEventListener('click', () => {
      setMaterialMode('video');
      if (typeof updateSizeFramingPreview === 'function') updateSizeFramingPreview();
    });
  }
  if (patternBtnA) patternBtnA.addEventListener('click', () => setVideoPattern('A'));
  if (patternBtnB) {
    patternBtnB.addEventListener('click', () => {
      setVideoPattern('B');
      if (!capturedVideoFrameCanvas) captureFrameFromSourceVideo();
    });
  }

  if (videoMaterialUploadBtn && videoMaterialFileInput) {
    videoMaterialUploadBtn.addEventListener('click', () => {
      triggerHaptic();
      if (videoMaterialUploadBtn.tagName.toLowerCase() !== 'label') {
        videoMaterialFileInput.click();
      }
    });
    videoMaterialUploadBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerHaptic();
        videoMaterialFileInput.click();
      }
    });

    videoMaterialFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      triggerHaptic();

      uploadedVideoMaterialFile = file;
      if (uploadedVideoMaterialUrl) {
        try { URL.revokeObjectURL(uploadedVideoMaterialUrl); } catch (e) {}
      }
      uploadedVideoMaterialUrl = URL.createObjectURL(file);

      if (videoMaterialCardTitle) {
        videoMaterialCardTitle.textContent = `✔ 読込完了: ${file.name}`;
      }
      if (videoMaterialCardHint) {
        videoMaterialCardHint.textContent = `サイズ: ${(file.size / (1024 * 1024)).toFixed(1)}MB（下のパターン①またはパターン②を選択してください）`;
      }
      if (videoMaterialUploadBtn) {
        videoMaterialUploadBtn.style.borderColor = '#10b981';
      }

      if (sourceVideoPlayer) {
        sourceVideoPlayer.src = uploadedVideoMaterialUrl;
        sourceVideoPlayer.load();
        sourceVideoPlayer.onloadedmetadata = () => {
          const vw = sourceVideoPlayer.videoWidth || 0;
          const vh = sourceVideoPlayer.videoHeight || 0;
          if (sourceVideoDurationLabel) {
            sourceVideoDurationLabel.textContent = `長さ: ${formatTime(sourceVideoPlayer.duration || 0)}${vw && vh ? ` (${vw}×${vh})` : ''}`;
          }
          setTimeout(() => {
            try {
              sourceVideoPlayer.currentTime = 0.1;
              sourceVideoPlayer.onseeked = () => {
                captureFrameFromSourceVideo();
                sourceVideoPlayer.onseeked = null;
              };
            } catch (e) {}
          }, 300);
        };
      }

      if (videoPatternSection) {
        videoPatternSection.classList.remove('hidden');
      }

      showToast(`🎬 動画「${file.name}」を読み込みました！`);
      videoMaterialFileInput.value = '';
    });
  }

  if (changeVideoMaterialBtn && videoMaterialFileInput) {
    changeVideoMaterialBtn.addEventListener('click', () => {
      triggerHaptic();
      videoMaterialFileInput.click();
    });
  }

  if (captureVideoFrameBtn) {
    captureVideoFrameBtn.addEventListener('click', () => {
      triggerHaptic();
      const canvas = captureFrameFromSourceVideo();
      if (canvas) {
        const curSec = sourceVideoPlayer ? sourceVideoPlayer.currentTime : 0;
        showToast(`📸 動画の ${formatTime(curSec)} の1コマを写真としてセットしました！`);
      }
    });
  }

  // ==========================================
  // v12.5: Output Video Size (Aspect Ratio, Fit Mode, Resolution) Controller
  // ==========================================
  function getActiveSourceDimensions() {
    if (activeMaterialMode === 'video' && sourceVideoPlayer && sourceVideoPlayer.videoWidth && sourceVideoPlayer.videoHeight) {
      return { width: sourceVideoPlayer.videoWidth, height: sourceVideoPlayer.videoHeight };
    }
    const srcImg = characterRenderer.customAvatarImg;
    if (srcImg && (srcImg.width || srcImg.naturalWidth)) {
      return {
        width: srcImg.width || srcImg.naturalWidth || 720,
        height: srcImg.height || srcImg.naturalHeight || 1280
      };
    }
    return { width: 720, height: 1280 };
  }

  function getTargetVideoDimensions(sizeMode = selectedOutputVideoSize, resMode = selectedOutputResolution) {
    const shortEdge = (resMode === '1080p') ? 1080 : 720;
    const longEdge = (resMode === '1080p') ? 1920 : 1280;

    if (sizeMode === '9:16') {
      return { width: shortEdge, height: longEdge, label: `縦型 9:16 (${shortEdge}×${longEdge})`, aspectRatio: '9:16' };
    }
    if (sizeMode === '16:9') {
      return { width: longEdge, height: shortEdge, label: `横型 16:9 (${longEdge}×${shortEdge})`, aspectRatio: '16:9' };
    }
    if (sizeMode === '1:1') {
      return { width: shortEdge, height: shortEdge, label: `正方形 1:1 (${shortEdge}×${shortEdge})`, aspectRatio: '1:1' };
    }
    // 'original'
    const srcDim = getActiveSourceDimensions();
    const sw = Math.max(1, srcDim.width);
    const sh = Math.max(1, srcDim.height);
    let tw = sw;
    let th = sh;
    if (sw >= sh) {
      tw = longEdge;
      th = Math.max(2, Math.round((sh * longEdge) / sw));
    } else {
      th = longEdge;
      tw = Math.max(2, Math.round((sw * longEdge) / sh));
    }
    // Ensure even pixel dimensions for H.264/MP4 compatibility
    if (tw % 2 !== 0) tw += 1;
    if (th % 2 !== 0) th += 1;
    const detectedRatio = (tw > th * 1.15) ? '16:9' : (th > tw * 1.15 ? '9:16' : '1:1');
    return { width: tw, height: th, label: `元素材の比率 (${tw}×${th})`, aspectRatio: detectedRatio };
  }

  function renderFramedCanvas(srcElement, targetW, targetH, sizeMode, fitMode) {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetW;
    outCanvas.height = targetH;
    const ctx = outCanvas.getContext('2d');

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, targetW, targetH);

    if (!srcElement) return outCanvas;
    const sw = srcElement.videoWidth || srcElement.naturalWidth || srcElement.width || targetW;
    const sh = srcElement.videoHeight || srcElement.naturalHeight || srcElement.height || targetH;
    if (!sw || !sh) return outCanvas;

    if (sizeMode === 'original') {
      ctx.drawImage(srcElement, 0, 0, targetW, targetH);
      return outCanvas;
    }

    if (fitMode === 'contain_blur') {
      // 1. iOS-compatible smooth blurred background via downscaled offscreen canvas
      const blurCanvas = document.createElement('canvas');
      blurCanvas.width = 48;
      blurCanvas.height = 48;
      const bCtx = blurCanvas.getContext('2d');
      const bgScale = Math.max(48 / sw, 48 / sh);
      const bgW = sw * bgScale;
      const bgH = sh * bgScale;
      bCtx.drawImage(srcElement, (48 - bgW) / 2, (48 - bgH) / 2, bgW, bgH);

      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(blurCanvas, 0, 0, targetW, targetH);
      ctx.fillStyle = 'rgba(9, 13, 22, 0.45)';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.restore();

      // 2. Draw full image centered inside target frame without cropping
      const scale = Math.min(targetW / sw, targetH / sh);
      const drawW = Math.round(sw * scale);
      const drawH = Math.round(sh * scale);
      const dx = Math.round((targetW - drawW) / 2);
      const dy = Math.round((targetH - drawH) / 2);
      ctx.drawImage(srcElement, dx, dy, drawW, drawH);
    } else {
      // 'cover': Fill entire frame (bias vertical offset slightly toward upper-center so singer's face/head is preserved)
      const scale = Math.max(targetW / sw, targetH / sh);
      const drawW = Math.round(sw * scale);
      const drawH = Math.round(sh * scale);
      const dx = Math.round((targetW - drawW) / 2);
      const dy = Math.round((targetH - drawH) * 0.32);
      ctx.drawImage(srcElement, dx, dy, drawW, drawH);
    }

    return outCanvas;
  }

  function updateSizeFramingPreview() {
    const dim = getTargetVideoDimensions(selectedOutputVideoSize, selectedOutputResolution);
    const iconMap = { '9:16': '📱', '16:9': '📺', '1:1': '🟦', 'original': '🖼️' };
    const icon = iconMap[selectedOutputVideoSize] || '📐';

    if (selectedSizeSummaryBadge) {
      selectedSizeSummaryBadge.textContent = `${icon} ${dim.label}`;
    }

    if (fitModeSubBox) {
      if (selectedOutputVideoSize === 'original') {
        fitModeSubBox.style.opacity = '0.5';
      } else {
        fitModeSubBox.style.opacity = '1';
      }
    }

    if (sizeFramingPreviewTitle) {
      sizeFramingPreviewTitle.textContent = `完成サイズ: ${dim.label}`;
    }
    if (sizeFramingPreviewSub) {
      const fitText = selectedOutputVideoSize === 'original'
        ? '元の写真・動画の縦横比をそのまま維持します'
        : (selectedOutputFitMode === 'contain_blur' ? '写真全体を表示（余白は背景ぼかし）' : '画面いっぱいに拡大（余白なし）');
      sizeFramingPreviewSub.textContent = `${fitText} — 左の枠の形で動画が生成されます`;
    }

    // Also keep stageCanvas dimensions synced with selected output size
    if (stageCanvas) {
      stageCanvas.width = dim.width;
      stageCanvas.height = dim.height;
    }

    if (sizeFramingPreviewCanvas) {
      // Scale preview canvas inside 68x68 box while preserving exact aspect ratio
      const maxThumb = 64;
      let pw = maxThumb;
      let ph = maxThumb;
      if (dim.width >= dim.height) {
        pw = maxThumb;
        ph = Math.max(20, Math.round((dim.height * maxThumb) / dim.width));
      } else {
        ph = maxThumb;
        pw = Math.max(20, Math.round((dim.width * maxThumb) / dim.height));
      }
      sizeFramingPreviewCanvas.width = pw * 2;
      sizeFramingPreviewCanvas.height = ph * 2;
      sizeFramingPreviewCanvas.style.width = `${pw}px`;
      sizeFramingPreviewCanvas.style.height = `${ph}px`;

      const srcEl = (activeMaterialMode === 'video' && capturedVideoFrameCanvas)
        ? capturedVideoFrameCanvas
        : (characterRenderer.customAvatarImg || characterRenderer.defaultSampleImg || null);

      const pCtx = sizeFramingPreviewCanvas.getContext('2d');
      if (srcEl) {
        const framed = renderFramedCanvas(srcEl, pw * 2, ph * 2, selectedOutputVideoSize, selectedOutputFitMode);
        pCtx.drawImage(framed, 0, 0);
      } else {
        pCtx.fillStyle = '#1e293b';
        pCtx.fillRect(0, 0, pw * 2, ph * 2);
        pCtx.fillStyle = '#7dd3fc';
        pCtx.font = 'bold 20px sans-serif';
        pCtx.textAlign = 'center';
        pCtx.textBaseline = 'middle';
        pCtx.fillText(selectedOutputVideoSize === 'original' ? 'AUTO' : selectedOutputVideoSize, pw, ph);
      }
    }
  }

  // Event Listeners for Output Video Size Buttons (strictly 1 active item)
  document.querySelectorAll('.video-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic();
      document.querySelectorAll('.video-size-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = '';
        b.style.borderColor = '';
        const pill = b.querySelector('.size-pill');
        if (pill) {
          pill.textContent = 'タップで選択';
          pill.style.background = '';
          pill.style.color = '';
        }
      });
      btn.classList.add('active');
      const activePill = btn.querySelector('.size-pill');
      if (activePill) {
        activePill.textContent = '✔ 選択中';
        activePill.style.background = '';
        activePill.style.color = '';
      }
      selectedOutputVideoSize = btn.dataset.size || '9:16';
      updateSizeFramingPreview();
      const dim = getTargetVideoDimensions();
      showToast(`📐 完成動画サイズを「${dim.label}」に設定しました`);
    });
  });

  // Event Listeners for Fit Mode Buttons (strictly 1 active item)
  document.querySelectorAll('.video-fit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic();
      document.querySelectorAll('.video-fit-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = '';
        b.style.borderColor = '';
        b.style.color = '';
      });
      btn.classList.add('active');
      selectedOutputFitMode = btn.dataset.fit || 'cover';
      updateSizeFramingPreview();
      showToast(selectedOutputFitMode === 'contain_blur'
        ? '✨ 写真全体を入れる（背景ぼかし余白）に切り替えました'
        : '🔍 画面いっぱいに拡大（余白なし）に切り替えました');
    });
  });

  // Event Listeners for Resolution Buttons (720p / 1080p - strictly 1 active item)
  document.querySelectorAll('.video-res-btn[data-res]').forEach(btn => {
    btn.addEventListener('click', () => {
      triggerHaptic();
      document.querySelectorAll('.video-res-btn[data-res]').forEach(b => {
        b.classList.remove('active');
        b.style.background = '';
        b.style.borderColor = '';
        b.style.color = '';
      });
      btn.classList.add('active');
      selectedOutputResolution = btn.dataset.res || '720p';
      updateSizeFramingPreview();
      const dim = getTargetVideoDimensions();
      showToast(`🎞️ 解像度を「${selectedOutputResolution.toUpperCase()} (${dim.width}×${dim.height})」に設定しました`);
    });
  });

  // Initialize size preview on load
  setTimeout(() => updateSizeFramingPreview(), 150);

  // Style chips in STEP 4 (strictly 1 active chip)
  document.querySelectorAll('.ai-style-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      triggerHaptic();
      document.querySelectorAll('.ai-style-chip').forEach(c => {
        c.classList.remove('active');
        c.style.background = '';
        c.style.borderColor = '';
        c.style.color = '';
      });
      chip.classList.add('active');
      selectedAiPromptStyle = chip.dataset.style || 'sway';
      if (aiVideoPromptInput && chip.dataset.prompt) {
        aiVideoPromptInput.value = chip.dataset.prompt;
      }
      characterRenderer.aiPromptStyle = selectedAiPromptStyle;
      showToast('✨ 演出プロンプトを変更しました');
    });
  });

  function openApiModal() {
    triggerHaptic();
    if (falApiKeyInput) falApiKeyInput.value = getSavedFalApiKey();
    if (aiSettingsModal) {
      aiSettingsModal.classList.remove('hidden');
      aiSettingsModal.classList.add('visible');
    }
  }

  function closeApiModal() {
    if (aiSettingsModal) {
      aiSettingsModal.classList.remove('visible');
      aiSettingsModal.classList.add('hidden');
    }
  }

  if (openAiSettingsBtn) {
    openAiSettingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openApiModal();
    });
  }

  if (closeAiSettingsBtn) {
    closeAiSettingsBtn.addEventListener('click', closeApiModal);
  }
  if (closeAiSettingsBottomBtn) {
    closeAiSettingsBottomBtn.addEventListener('click', closeApiModal);
  }

  if (saveAiSettingsBtn) {
    saveAiSettingsBtn.addEventListener('click', () => {
      triggerHaptic();
      const val = falApiKeyInput ? falApiKeyInput.value : '';
      saveFalApiKey(val);
      closeApiModal();
    });
  }

  // Helper: Convert Blob to Base64 Data URL
  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(blob);
    });
  }

  // Helper: Extract Canvas as JPEG Blob
  function canvasToJpegBlob(canvas, quality = 0.9) {
    return new Promise((resolve) => {
      if (canvas && typeof canvas.toBlob === 'function') {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
      } else {
        resolve(null);
      }
    });
  }

  // Helper: Extract Canvas as Lossless PNG Blob (Preserves 100% of character face contours & art style)
  function canvasToPngBlob(canvas) {
    return new Promise((resolve) => {
      if (canvas && typeof canvas.toBlob === 'function') {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      } else {
        resolve(null);
      }
    });
  }

  // Apply completed AI video URL to Inline Player, Save Modal, and Stage
  async function handleCompletedAiVideo(videoUrl, modelLabel) {
    const dim = getTargetVideoDimensions();
    showAiStatus(`🎉 <strong>「${modelLabel}」のAI動画（${dim.label}）が完成しました！</strong><br>下のビデオプレイヤーですぐに再生・カメラロール保存ができます。`, '#10b981');
    showToast(`🎉 ${modelLabel} の生成が完了しました！`);

    // 1. Show inline video player card
    if (aiResultCard && inlineAiResultVideo) {
      inlineAiResultVideo.src = videoUrl;
      inlineAiResultVideo.load();
      aiResultCard.classList.remove('hidden');
    }

    // 2. Also attach to Stage Renderer (unmuted when playing standalone, or synced on stage)
    const vidEl = document.createElement('video');
    vidEl.crossOrigin = 'anonymous';
    vidEl.src = videoUrl;
    vidEl.loop = true;
    vidEl.muted = true;
    vidEl.playsInline = true;
    vidEl.setAttribute('playsinline', '');
    vidEl.onloadeddata = () => {
      vidEl.play().catch(() => {});
      characterRenderer.setAiVideo(vidEl);
      characterRenderer.aiMotionActive = true;
      characterRenderer.aiModelBadge = modelLabel;
    };

    // 3. Download MP4 Blob in background so iPhone "Save to Photos (Camera Roll)" works in 1 tap
    try {
      const resp = await fetch(videoUrl);
      if (resp.ok) {
        const mp4Blob = await resp.blob();
        const cleanBlob = new Blob([mp4Blob], { type: 'video/mp4' });
        const songTitle = (currentSongConfig && currentSongConfig.title) ? currentSongConfig.title : 'LipsyncMV';
        const songNameClean = songTitle.replace(/[\s\/\\?%*:|"<>]+/g, '_');
        const sizeTag = selectedOutputVideoSize === 'original' ? 'orig' : selectedOutputVideoSize.replace(':', 'x');
        const filename = `AI_Lipsync_${songNameClean}_${sizeTag}.mp4`;

        if (lastRecordedUrl) {
          try { URL.revokeObjectURL(lastRecordedUrl); } catch (e) {}
        }
        lastRecordedBlob = cleanBlob;
        lastRecordedUrl = URL.createObjectURL(cleanBlob);
        lastRecordedFilename = filename;
        try {
          lastRecordedFile = new File([cleanBlob], filename, { type: 'video/mp4' });
        } catch (e) {
          lastRecordedFile = null;
        }

        if (inlineAiResultVideo) {
          inlineAiResultVideo.src = lastRecordedUrl;
        }
        openCompleteModal(lastRecordedUrl, filename, Math.round(trimDurationSeconds || 15));
      }
    } catch (dlErr) {
      console.warn('Could not pre-fetch MP4 blob, using direct remote URL:', dlErr);
      lastRecordedUrl = videoUrl;
      lastRecordedFilename = 'AI_Lipsync_MV.mp4';
      openCompleteModal(videoUrl, 'AI_Lipsync_MV.mp4', Math.round(trimDurationSeconds || 15));
    }
  }

  if (saveAiResultToPhotosBtn) {
    saveAiResultToPhotosBtn.addEventListener('click', () => {
      if (saveToPhotosBtn) {
        saveToPhotosBtn.click();
      } else if (lastRecordedUrl) {
        window.open(lastRecordedUrl, '_blank');
      }
    });
  }

  if (downloadAiResultMp4Btn) {
    downloadAiResultMp4Btn.addEventListener('click', () => {
      if (lastRecordedBlob) {
        triggerBlobDownload(lastRecordedBlob, lastRecordedFilename || 'AI_Lipsync_MV.mp4');
        showToast('MP4動画のダウンロードを開始しました');
      } else if (lastRecordedUrl) {
        window.open(lastRecordedUrl, '_blank');
      }
    });
  }

  // Real Fal.ai API Lip-Sync & Video Generation Handler (No 0-yen fake fallback!)
  if (generateAiLipsyncBtn) {
    generateAiLipsyncBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      triggerHaptic();

      // Check inline input first in case user pasted key but didn't click save yet
      if (inlineFalApiKeyInput && inlineFalApiKeyInput.value.trim() && !getSavedFalApiKey()) {
        saveFalApiKey(inlineFalApiKeyInput.value.trim());
      }

      const apiKey = getSavedFalApiKey();
      if (!apiKey) {
        showAiStatus('⚠️ <strong>Fal.ai のAPIキーがまだ登録されていません。</strong><br>画面一番上の「🔑 Fal.ai APIキーの取得・登録」でキーを貼り付けて保存してください。', '#f59e0b');
        showToast('🔑 まず一番上の欄に Fal.ai APIキーを貼り付けて保存してください');
        if (inlineFalApiKeyInput) {
          inlineFalApiKeyInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => inlineFalApiKeyInput.focus(), 400);
        } else {
          openApiModal();
        }
        return;
      }

      const isVideoToVideo = (activeMaterialMode === 'video' && activeVideoPattern === 'A');

      if (isVideoToVideo) {
        if (!uploadedVideoMaterialFile) {
          showAiStatus('⚠️ <strong>STEP 1 で人物の動画がまだアップロードされていません。</strong><br>まず歌わせたい人物の動画（MP4またはMOV）を選んでください。', '#f59e0b');
          showToast('🎬 STEP 1 で人物の動画をアップロードしてください');
          if (videoMaterialUploadBtn) videoMaterialUploadBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      } else {
        if (!characterRenderer.customAvatarImg && activeMaterialMode === 'video' && activeVideoPattern === 'B' && sourceVideoPlayer) {
          captureFrameFromSourceVideo();
          if (!characterRenderer.customAvatarImg && uploadedVideoMaterialUrl) {
            await new Promise((resolve) => {
              const onReady = () => {
                captureFrameFromSourceVideo();
                resolve();
              };
              sourceVideoPlayer.addEventListener('loadeddata', onReady, { once: true });
              setTimeout(onReady, 800);
            });
          }
        }
        if (!characterRenderer.customAvatarImg) {
          showAiStatus('⚠️ <strong>STEP 1 で人物の写真または動画の切り出しがセットされていません。</strong><br>まず歌わせたい人物の写真（または動画）をセットしてください。', '#f59e0b');
          showToast('📷 STEP 1 で歌わせたい人物の写真をアップロードしてください');
          if (avatarUploadBtn) avatarUploadBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }

      if (!audioEngine.hasAudioLoaded()) {
        showAiStatus('⚠️ <strong>STEP 2 で楽曲ファイルがまだアップロードされていません。</strong><br>リップシンク（口パク歌唱）には元になる楽曲が必要です。STEP 2 で楽曲を取り込んでください。', '#f59e0b');
        showToast('🎵 STEP 2 であなたの楽曲ファイルをアップロードしてください');
        audioUploadBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      let rawPromptText = (aiVideoPromptInput && aiVideoPromptInput.value.trim())
        ? aiVideoPromptInput.value.trim()
        : 'The camera slowly and gently moves in. Calm, gentle singing with a soft natural smile and subtle, relaxed upper body sway.';

      // v15.0: 🔒 Anti-Grimace / Anti-Yokai Prompt Sanitizer
      // Words like "facial features, eye shape, keeping eyes open, passionate, expressive eyebrows" cause T5 attention spikes
      // on the eyes and teeth, making the AI bulge the eyes and stretch the mouth like a demon. Strip them completely!
      if (enableIdentityLock) {
        rawPromptText = rawPromptText
          .replace(/Strictly preserve the exact original face[^.]*\.\s*/gi, '')
          .replace(/Do not alter facial identity or art style\.\s*/gi, '')
          .replace(/\b(passionate|passionately|intense|dramatic|expressive\s+eyebrows)\b/gi, 'gentle')
          .replace(/keeping\s+eyes\s+open(\s+and\s+clear)?/gi, 'relaxed expression')
          .replace(/eyes\s+closing(\s+on\s+emotional\s+high\s+notes)?/gi, 'soft smile')
          .replace(/\b(photorealistic|hyperrealistic|realistic)\b/gi, 'natural')
          .trim();
        if (!rawPromptText) {
          rawPromptText = 'Calm, gentle singing with a soft natural smile and subtle movement.';
        }
      }
      const promptText = rawPromptText;

      generateAiLipsyncBtn.disabled = true;
      const originalBtnHtml = generateAiLipsyncBtn.innerHTML;
      let elapsedSec = 0;
      let progressTimer = null;

      // Helper: Soft-limit and attenuate audio buffer to conversational speech level (peak ~0.22 / -13 dBFS)
      // Prevents loud mastered vocals (0 dBFS) from making Lip-Sync AI think the singer is screaming (which causes demon/yokai jaw & eyes)
      function buildGentleLipsyncBuffer(inputBuf, minDurationSec = 4.2, targetPeak = 0.22) {
        const ctx = audioEngine.ctx || new (window.AudioContext || window.webkitAudioContext)();
        audioEngine.ctx = ctx;
        const sr = inputBuf.sampleRate;
        const ch = inputBuf.numberOfChannels;
        const minSamples = Math.ceil(minDurationSec * sr);
        const outLen = Math.max(inputBuf.length, minSamples);
        const outBuf = ctx.createBuffer(ch, outLen, sr);

        let maxAbs = 0.001;
        for (let c = 0; c < ch; c++) {
          const d = inputBuf.getChannelData(c);
          for (let i = 0; i < d.length; i++) {
            const a = Math.abs(d[i]);
            if (a > maxAbs) maxAbs = a;
          }
        }

        const scale = enableIdentityLock ? Math.min(1.0, targetPeak / maxAbs) : 1.0;
        for (let c = 0; c < ch; c++) {
          const src = inputBuf.getChannelData(c);
          const dst = outBuf.getChannelData(c);
          for (let i = 0; i < src.length; i++) {
            // Soft-knee tanh compression + gentle peak scaling so high notes never spike jaw opening
            const norm = src[i] / maxAbs;
            const soft = enableIdentityLock ? Math.tanh(norm * 1.4) / Math.tanh(1.4) : norm;
            dst[i] = soft * (enableIdentityLock ? targetPeak : maxAbs);
          }
        }
        return outBuf;
      }

      try {
        const targetDim = getTargetVideoDimensions(selectedOutputVideoSize, selectedOutputResolution);
        const materialLabel = isVideoToVideo ? '動画' : '写真';
        showAiStatus(`⏳ <strong>[1/3] 完成サイズ「${targetDim.label}」で${materialLabel}と切り出し音源（${formatTime(audioEngine.trimStart || 0)}〜${formatTime(audioEngine.trimEnd || 15)}）を準備しています...</strong>`, '#c084fc');

        // 1. Prepare Sliced Audio File (Original Full-Volume for final merge + Gentle Guide Audio for Lip-Sync AI)
        const srcBuf = audioEngine.ensureAudioBuffer();
        if (!srcBuf) {
          throw new Error('楽曲データのデコードに失敗しました。もう一度STEP 2で楽曲を選択してください。');
        }
        const startSec = audioEngine.trimStart || 0;
        const rawEndSec = Math.max(startSec + 0.5, audioEngine.trimEnd || (startSec + 15));
        // OmniHuman 2.0 requires minimum 4 seconds of audio
        const needsMin4Sec = (selectedV11bModel && selectedV11bModel.includes('omnihuman/v2'));
        const endSec = needsMin4Sec ? Math.max(startSec + 4.2, rawEndSec) : rawEndSec;
        const slicedBuf = sliceBufferDirect(srcBuf, startSec, endSec);

        // 1A. Original full-volume audio (merged onto final video so music is 100% loud & crisp)
        let audioBlob = null;
        let audioMime = 'audio/mpeg';
        let audioFilename = 'vocal_cut.mp3';
        try {
          audioBlob = encodeMp3Direct(slicedBuf);
          if (audioBlob && audioBlob.type === 'audio/wav') {
            audioMime = 'audio/wav';
            audioFilename = 'vocal_cut.wav';
          }
        } catch (mp3Err) {
          console.warn('MP3 encode fallback to WAV:', mp3Err);
          audioBlob = encodeWavDirect(slicedBuf);
          audioMime = 'audio/wav';
          audioFilename = 'vocal_cut.wav';
        }
        const audioFile = new File([audioBlob], audioFilename, { type: audioMime });
        const audioDataUrl = await blobToDataUrl(audioBlob);

        // 1B. Gentle guide audio (soft-limited to -13 dBFS so Lip-Sync AI never distorts face into a screaming monster)
        const gentleBuf = buildGentleLipsyncBuffer(slicedBuf, needsMin4Sec ? 4.2 : 1.0, 0.22);
        let gentleAudioBlob = null;
        let gentleAudioMime = 'audio/mpeg';
        let gentleAudioFilename = 'guide_gentle.mp3';
        try {
          gentleAudioBlob = encodeMp3Direct(gentleBuf);
          if (gentleAudioBlob && gentleAudioBlob.type === 'audio/wav') {
            gentleAudioMime = 'audio/wav';
            gentleAudioFilename = 'guide_gentle.wav';
          }
        } catch (gErr) {
          gentleAudioBlob = encodeWavDirect(gentleBuf);
          gentleAudioMime = 'audio/wav';
          gentleAudioFilename = 'guide_gentle.wav';
        }
        const gentleAudioFile = new File([gentleAudioBlob], gentleAudioFilename, { type: gentleAudioMime });

        // 2. Prepare Formatted Image File matching selected Output Video Size (9:16, 16:9, 1:1, or original)
        // v15.0: Use Lossless PNG when Identity Lock is ON to prevent any JPEG compression artifacts on eyes/mouth/lines
        let imgBlob = null;
        let imgDataUrl = '';
        let imgFile = null;
        if (!isVideoToVideo) {
          const formattedCanvas = renderFramedCanvas(
            characterRenderer.customAvatarImg,
            targetDim.width,
            targetDim.height,
            selectedOutputVideoSize,
            selectedOutputFitMode
          );
          if (enableIdentityLock) {
            imgBlob = await canvasToPngBlob(formattedCanvas);
            imgDataUrl = formattedCanvas.toDataURL('image/png');
            imgFile = imgBlob ? new File([imgBlob], `artist_${targetDim.width}x${targetDim.height}.png`, { type: 'image/png' }) : null;
          } else {
            imgBlob = await canvasToJpegBlob(formattedCanvas, 0.95);
            imgDataUrl = formattedCanvas.toDataURL('image/jpeg', 0.95);
            imgFile = imgBlob ? new File([imgBlob], `artist_${targetDim.width}x${targetDim.height}.jpg`, { type: 'image/jpeg' }) : null;
          }
        }

        // Start live elapsed second counter for user feedback
        progressTimer = setInterval(() => {
          elapsedSec += 1;
          generateAiLipsyncBtn.innerHTML = `<span>⏳ AIリップシンク生成中... (${elapsedSec}秒経過)</span>`;
        }, 1000);

        let finalVideoUrl = '';

        // 3. Call Fal.ai via official @fal-ai/client
        let sdkConnected = false;
        try {
          const falModule = await import('https://cdn.jsdelivr.net/npm/@fal-ai/client/+esm');
          const createFalClient = falModule.createFalClient || (falModule.default && falModule.default.createFalClient);

          if (createFalClient) {
            sdkConnected = true;
            const falClient = createFalClient({ credentials: apiKey });

            showAiStatus(`⏳ <strong>[準備] Fal.ai サーバーへ${materialLabel}（${targetDim.label}）と切り出し音源をアップロード中...</strong>`, '#38bdf8');
            let uploadedOriginalAudioUrl = audioDataUrl;
            let uploadedGentleGuideUrl = audioDataUrl;

            if (falClient.storage && typeof falClient.storage.upload === 'function') {
              try {
                uploadedOriginalAudioUrl = await falClient.storage.upload(audioFile);
                if (enableIdentityLock) {
                  uploadedGentleGuideUrl = await falClient.storage.upload(gentleAudioFile);
                } else {
                  uploadedGentleGuideUrl = uploadedOriginalAudioUrl;
                }
              } catch (uErr) {
                console.warn('Audio storage upload fallback to DataURL:', uErr);
              }
            }

            // =========================================================================
            // 🎙️ 【改善B】AIボーカル自動分離 (fal-ai/demucs) ＋ 顔崩壊（絶叫顔）防止ソフト音量調整
            // =========================================================================
            let lipSyncAudioUrl = enableIdentityLock ? uploadedGentleGuideUrl : uploadedOriginalAudioUrl;
            let didSeparateVocals = false;
            const isolatedVocalPreviewBox = document.getElementById('isolatedVocalPreviewBox');
            const isolatedVocalAudioPlayer = document.getElementById('isolatedVocalAudioPlayer');

            if (enableVocalSeparation && selectedV11bMode !== 'video') {
              try {
                showAiStatus(`🎙️ <strong>[改善B] AIボーカル自動分離（Demucs）で曲から「歌声だけ」を抽出しています... (${elapsedSec}秒経過)</strong><br><small style="color:#a7f3d0;">※ 伴奏音による口の誤作動を防ぎ、さらに顔が歪まないよう口パク計算用の音量を優しく整えます。</small>`, '#10b981');
                const demucsRes = await falClient.subscribe('fal-ai/demucs', {
                  input: {
                    audio_url: uploadedOriginalAudioUrl,
                    output_format: 'mp3'
                  },
                  logs: true,
                  onQueueUpdate: (st) => {
                    if (st && st.status === 'IN_PROGRESS') {
                      showAiStatus(`🎙️ <strong>[改善B] AIが伴奏をカットしてボーカル声だけを抽出中... (${elapsedSec}秒経過)</strong><br><small style="color:#a7f3d0;">抽出完了後、続けて最新AIでの口パク生成に進みます。</small>`, '#10b981');
                    }
                  }
                });
                const demucsData = (demucsRes && demucsRes.data) ? demucsRes.data : demucsRes;
                const vocalTrackUrl = (demucsData && demucsData.vocals && demucsData.vocals.url)
                  || (demucsData && typeof demucsData.vocals === 'string' ? demucsData.vocals : '');
                if (vocalTrackUrl) {
                  didSeparateVocals = true;
                  if (isolatedVocalPreviewBox && isolatedVocalAudioPlayer) {
                    isolatedVocalAudioPlayer.src = vocalTrackUrl;
                    isolatedVocalPreviewBox.classList.remove('hidden');
                  }
                  // When Identity Lock is ON, decode the extracted vocal track and soft-limit its peak to 0.22 (-13dB)
                  // so high/loud vocal notes NEVER cause the AI to open the jaw 200% wide like a demon!
                  if (enableIdentityLock && falClient.storage && typeof falClient.storage.upload === 'function') {
                    try {
                      const vResp = await fetch(vocalTrackUrl);
                      if (vResp.ok) {
                        const vArr = await vResp.arrayBuffer();
                        const ctx = audioEngine.ctx || new (window.AudioContext || window.webkitAudioContext)();
                        audioEngine.ctx = ctx;
                        const decodedVocalBuf = await ctx.decodeAudioData(vArr);
                        const gentleVocalBuf = buildGentleLipsyncBuffer(decodedVocalBuf, needsMin4Sec ? 4.2 : 1.0, 0.22);
                        let gVocalBlob = null;
                        let gVocalMime = 'audio/mpeg';
                        let gVocalName = 'vocals_gentle.mp3';
                        try {
                          gVocalBlob = encodeMp3Direct(gentleVocalBuf);
                          if (gVocalBlob && gVocalBlob.type === 'audio/wav') {
                            gVocalMime = 'audio/wav';
                            gVocalName = 'vocals_gentle.wav';
                          }
                        } catch (ge) {
                          gVocalBlob = encodeWavDirect(gentleVocalBuf);
                          gVocalMime = 'audio/wav';
                          gVocalName = 'vocals_gentle.wav';
                        }
                        const gVocalFile = new File([gVocalBlob], gVocalName, { type: gVocalMime });
                        lipSyncAudioUrl = await falClient.storage.upload(gVocalFile);
                      } else {
                        lipSyncAudioUrl = vocalTrackUrl;
                      }
                    } catch (normErr) {
                      console.warn('Vocal soft-limit fallback to direct vocalTrackUrl:', normErr);
                      lipSyncAudioUrl = vocalTrackUrl;
                    }
                  } else {
                    lipSyncAudioUrl = vocalTrackUrl;
                  }
                }
              } catch (demucsErr) {
                console.warn('Demucs vocal separation skipped/fallback to guide audio:', demucsErr);
              }
            }

            const trimDur = endSec - startSec;

            // =========================================================================
            // 🔒 【v16.0 新標準】「別人化ゼロ・元写真100%固定」Photo-Lock V2V 口唇限定モード (①〜④)
            // AIによる顔全体の生成（image-to-video）を完全廃止し、
            // 1. 元写真を FFmpeg で無劣化のまま固定ビデオ（MP4）に変換
            // 2. Video-to-Video 口唇限定モデル（model_mode: "lips" 等）で「くちびる領域のみ」を同期
            // これにより目・眉・鼻・輪郭・髪・画風は100%元写真の生ピクセルのまま維持されます。
            // =========================================================================
            if (!isVideoToVideo && selectedV11bMode === 'photolock_v2v') {
              let uploadedImageUrl = imgDataUrl;
              if (imgFile && falClient.storage && typeof falClient.storage.upload === 'function') {
                try {
                  uploadedImageUrl = await falClient.storage.upload(imgFile);
                } catch (uErr) {
                  console.warn('Image storage upload fallback to DataURL:', uErr);
                }
              }

              const durationMs = Math.max(2000, Math.round(trimDur * 1000));
              showAiStatus(`🔒 <strong>[顔100%固定・手順1/2] アップされた写真を無劣化のまま固定ベース動画（${Math.round(trimDur)}秒）に変換中... (${elapsedSec}秒経過)</strong><br><small style="color:#6ee7b7;">AIに顔を創作させないよう、目・鼻・輪郭・画風を元写真のピクセルのまま100%ロックしています。</small>`, '#10b981');

              let staticPhotoVideoUrl = '';
              try {
                const composeRes = await falClient.subscribe('fal-ai/ffmpeg-api/compose', {
                  input: {
                    tracks: [
                      {
                        id: 'photo_lock_track',
                        type: 'video',
                        keyframes: [
                          {
                            timestamp: 0,
                            duration: durationMs,
                            url: uploadedImageUrl
                          }
                        ]
                      }
                    ]
                  },
                  logs: true
                });
                const composeData = (composeRes && composeRes.data) ? composeRes.data : composeRes;
                staticPhotoVideoUrl = (composeData && composeData.video_url) || (composeData && composeData.video && composeData.video.url) || '';
              } catch (compErr) {
                console.warn('FFmpeg compose static video error:', compErr);
              }

              if (!staticPhotoVideoUrl) {
                throw new Error('元写真の固定ベース動画作成に失敗しました。もう一度お試しください。');
              }

              const targetV2VModel = selectedV11bModel || 'fal-ai/sync-lipsync/v3';
              showAiStatus(`🎤 <strong>[顔100%固定・手順2/2] 「${selectedV11bLabel}」で元の顔を一切変えず「くちびる（口唇）のみ」を歌声に同期中... (${elapsedSec}秒経過)</strong><br><small style="color:#6ee7b7;">目・鼻・輪郭は元の写真のまま、口元だけを自然に動かしています（約1〜2分）。</small>`, '#10b981');

              const runSync3LipsOnly = async () => {
                const r = await falClient.subscribe('fal-ai/sync-lipsync/v3', {
                  input: {
                    video_url: staticPhotoVideoUrl,
                    audio_url: lipSyncAudioUrl,
                    sync_mode: 'cut_off',
                    options: {
                      model_mode: 'lips',
                      sync_mode: 'cut_off'
                    }
                  },
                  logs: true,
                  onQueueUpdate: (st) => {
                    if (st && st.status === 'IN_PROGRESS') {
                      showAiStatus(`🎤 <strong>[顔100%固定] Sync-3 (model_mode: "lips") が口唇のみをピンポイント描画中... (${elapsedSec}秒経過)</strong><br><small style="color:#6ee7b7;">目・鼻・輪郭は元写真の生ピクセルを100%維持しています。</small>`, '#10b981');
                    }
                  }
                });
                const d = (r && r.data) ? r.data : r;
                return (d && d.video && d.video.url) || (d && d.video_url) || '';
              };

              if (targetV2VModel === 'fal-ai/sync-lipsync/react-1') {
                // Sync React-1 Lips-Only (supports up to 15s; >15s or error auto-chains to Sync-3 Lips-Only)
                if (trimDur <= 15) {
                  try {
                    const r1Res = await falClient.subscribe('fal-ai/sync-lipsync/react-1', {
                      input: {
                        video_url: staticPhotoVideoUrl,
                        audio_url: lipSyncAudioUrl,
                        model_mode: 'lips',
                        emotion: 'neutral',
                        temperature: 0.2,
                        lipsync_mode: 'cut_off'
                      },
                      logs: true
                    });
                    const r1Data = (r1Res && r1Res.data) ? r1Res.data : r1Res;
                    finalVideoUrl = (r1Data && r1Data.video && r1Data.video.url) || (r1Data && r1Data.video_url) || '';
                  } catch (r1Err) {
                    console.warn('React-1 Lips-Only fallback to Sync-3 Lips-Only:', r1Err);
                    finalVideoUrl = await runSync3LipsOnly();
                  }
                } else {
                  finalVideoUrl = await runSync3LipsOnly();
                }
              } else if (targetV2VModel === 'fal-ai/kling-video/lipsync/audio-to-video') {
                try {
                  const klRes = await falClient.subscribe('fal-ai/kling-video/lipsync/audio-to-video', {
                    input: {
                      video_url: staticPhotoVideoUrl,
                      audio_url: lipSyncAudioUrl
                    },
                    logs: true
                  });
                  const klData = (klRes && klRes.data) ? klRes.data : klRes;
                  finalVideoUrl = (klData && klData.video && klData.video.url) || (klData && klData.video_url) || '';
                } catch (klErr) {
                  console.warn('Kling LipSync V2V fallback to LatentSync / Sync-3 Lips-Only:', klErr);
                  try {
                    const lsRes = await falClient.subscribe('fal-ai/latentsync', {
                      input: {
                        video_url: staticPhotoVideoUrl,
                        audio_url: lipSyncAudioUrl
                      },
                      logs: true
                    });
                    const lsData = (lsRes && lsRes.data) ? lsRes.data : lsRes;
                    finalVideoUrl = (lsData && lsData.video && lsData.video.url) || (lsData && lsData.video_url) || '';
                  } catch (lsErr) {
                    finalVideoUrl = await runSync3LipsOnly();
                  }
                }
              } else if (targetV2VModel === 'fal-ai/heygen/v3/lipsync/precision') {
                try {
                  const hgRes = await falClient.subscribe('fal-ai/heygen/v3/lipsync/precision', {
                    input: {
                      video_url: staticPhotoVideoUrl,
                      audio_url: lipSyncAudioUrl
                    },
                    logs: true
                  });
                  const hgData = (hgRes && hgRes.data) ? hgRes.data : hgRes;
                  finalVideoUrl = (hgData && hgData.video && hgData.video.url) || (hgData && hgData.video_url) || '';
                } catch (hgErr) {
                  console.warn('HeyGen v3 V2V fallback to VEED v2 / Sync-3 Lips-Only:', hgErr);
                  try {
                    const vdRes = await falClient.subscribe('veed/lipsync/v2', {
                      input: {
                        video_url: staticPhotoVideoUrl,
                        audio_url: lipSyncAudioUrl
                      },
                      logs: true
                    });
                    const vdData = (vdRes && vdRes.data) ? vdRes.data : vdRes;
                    finalVideoUrl = (vdData && vdData.video && vdData.video.url) || (vdData && vdData.video_url) || '';
                  } catch (vdErr) {
                    finalVideoUrl = await runSync3LipsOnly();
                  }
                }
              } else {
                // Default Model ①: Sync-3 Video Lips-Only
                finalVideoUrl = await runSync3LipsOnly();
              }
            } else if (!isVideoToVideo && selectedV11bMode === 'hybrid_lipsync') {
              let uploadedImageUrl = imgDataUrl;
              if (imgFile && falClient.storage && typeof falClient.storage.upload === 'function') {
                try {
                  uploadedImageUrl = await falClient.storage.upload(imgFile);
                } catch (uErr) {
                  console.warn('Image storage upload fallback to DataURL:', uErr);
                }
              }

              const kling4DurInt = Math.max(3, Math.min(30, Math.round(trimDur)));
              const kling3DurStr = String(Math.max(3, Math.min(15, Math.round(trimDur))));

              showAiStatus(`🎬 <strong>[改善A・第1段階] 2026年10月最新「Kling 4.0」で顔の始点・終点をロックした高品質ムービーを生成中... (${elapsedSec}秒経過)</strong><br><small style="color:#fde047;">元の写真の顔を崩さずに自然なカメラワークと動き（${kling4DurInt}秒）を作っています。</small>`, '#eab308');

              let stage1VideoUrl = '';
              try {
                // Stage 1 Primary: Kling 4.0 (kling/v4/image-to-video)
                const k4Input = {
                  start_image_url: uploadedImageUrl,
                  prompt: promptText,
                  duration: kling4DurInt,
                  resolution: (selectedOutputResolution === '1080p') ? '1080p' : '720p'
                };
                if (enableIdentityLock) {
                  k4Input.end_image_url = uploadedImageUrl;
                }
                const s1Res = await falClient.subscribe('kling/v4/image-to-video', {
                  input: k4Input,
                  logs: true,
                  onQueueUpdate: (st) => {
                    if (!st) return;
                    if (st.status === 'IN_QUEUE') {
                      const pos = (typeof st.queue_position === 'number') ? ` (順番: ${st.queue_position + 1}番目)` : '';
                      showAiStatus(`⏳ <strong>[改善A・第1段階] 最新 Kling 4.0 の生成キュー待機中${pos}... (${elapsedSec}秒経過)</strong><br><small style="color:#fde047;">始点と終点にあなたの写真をロックして顔崩れを防ぎます。</small>`, '#eab308');
                    } else if (st.status === 'IN_PROGRESS') {
                      showAiStatus(`🎬 <strong>[改善A・第1段階] 最新 Kling 4.0 がカメラワークと身体の動きを描画中... (${elapsedSec}秒経過)</strong><br><small style="color:#fde047;">完成後、自動的に第2段階（口パク合成）へ進みます。</small>`, '#eab308');
                    }
                  }
                });
                const s1Data = (s1Res && s1Res.data) ? s1Res.data : s1Res;
                stage1VideoUrl = (s1Data && s1Data.video && s1Data.video.url) || (s1Data && s1Data.video_url) || '';
              } catch (s1Err) {
                console.warn('Kling 4.0 fallback to Kling 3.0 Pro:', s1Err);
                const k3Payload = {
                  start_image_url: uploadedImageUrl,
                  prompt: promptText,
                  duration: kling3DurStr,
                  generate_audio: false
                };
                if (enableIdentityLock) {
                  k3Payload.end_image_url = uploadedImageUrl;
                  k3Payload.negative_prompt = 'different face, changed facial features, altered art style, face morphing, deformed eyes, wide open mouth, scary face';
                }
                const s1Retry = await falClient.subscribe('fal-ai/kling-video/v3/pro/image-to-video', {
                  input: k3Payload,
                  logs: true
                });
                const s1RetryData = (s1Retry && s1Retry.data) ? s1Retry.data : s1Retry;
                stage1VideoUrl = (s1RetryData && s1RetryData.video && s1RetryData.video.url) || (s1RetryData && s1RetryData.video_url) || '';
              }

              if (!stage1VideoUrl) {
                throw new Error('第1段階（Kling 4.0）のベース動画URLが取得できませんでした。もう一度お試しください。');
              }

              // 第2段階：動いているKling動画に対して最新リップシンクAI（Sync v3 / HeyGen v3 / VEED v2）を実行
              const primaryStage2Model = selectedHybridStage2Model || 'fal-ai/sync-lipsync/v3';
              const backupStage2Model = primaryStage2Model.includes('sync-lipsync')
                ? 'veed/lipsync/v2'
                : 'fal-ai/sync-lipsync/v3';

              showAiStatus(`🎤 <strong>[改善A・第2段階] Kling 4.0 映像に「${selectedHybridStage2Label}」で控えめで自然な口パクを合成中... (${elapsedSec}秒経過)</strong><br><small style="color:#fbcfe8;">顔が歪まないよう優しい音量レベルで口元を同期しています。</small>`, '#ec4899');

              const buildStage2Payload = (mId) => {
                const p = {
                  video_url: stage1VideoUrl,
                  audio_url: lipSyncAudioUrl
                };
                if (mId.includes('sync-lipsync')) {
                  p.sync_mode = 'bounce';
                }
                return p;
              };

              try {
                const s2Res = await falClient.subscribe(primaryStage2Model, {
                  input: buildStage2Payload(primaryStage2Model),
                  logs: true,
                  onQueueUpdate: (st) => {
                    if (!st) return;
                    if (st.status === 'IN_PROGRESS') {
                      showAiStatus(`🎤 <strong>[改善A・第2段階] 「${selectedHybridStage2Label}」が口元の発音を同期描画中... (${elapsedSec}秒経過)</strong><br><small style="color:#fbcfe8;">完成まであと少しです！</small>`, '#ec4899');
                    }
                  }
                });
                const s2Data = (s2Res && s2Res.data) ? s2Res.data : s2Res;
                finalVideoUrl = (s2Data && s2Data.video && s2Data.video.url) || (s2Data && s2Data.video_url) || '';
              } catch (s2Err) {
                console.warn(`Stage 2 (${primaryStage2Model}) error, trying backup model (${backupStage2Model}):`, s2Err);
                try {
                  const s2BackupRes = await falClient.subscribe(backupStage2Model, {
                    input: buildStage2Payload(backupStage2Model),
                    logs: true
                  });
                  const s2BackupData = (s2BackupRes && s2BackupRes.data) ? s2BackupRes.data : s2BackupRes;
                  finalVideoUrl = (s2BackupData && s2BackupData.video && s2BackupData.video.url) || (s2BackupData && s2BackupData.video_url) || '';
                } catch (s2BackupErr) {
                  console.warn('Both Stage 2 lip-sync models failed, falling back to Stage 1 video with audio merge:', s2BackupErr);
                  finalVideoUrl = stage1VideoUrl;
                  didSeparateVocals = true;
                }
              }
            } else {
              // =========================================================================
              // 1段階生成モデル（OmniHuman 2.0 / Sync-3 Avatar / Mirage Avatar X / MiniMax H3 / Kling 4.0 / 動画口パク）
              // =========================================================================
              let inputPayload = {};
              let targetEndpoint = selectedV11bModel || 'bytedance/omnihuman/v2';

              if (isVideoToVideo) {
                // Video-to-Video LipSync (Sync Lipsync v3 / HeyGen v3 Precision / VEED Lipsync v2)
                let uploadedVideoUrl = '';
                if (falClient.storage && typeof falClient.storage.upload === 'function') {
                  uploadedVideoUrl = await falClient.storage.upload(uploadedVideoMaterialFile);
                } else {
                  throw new Error('動画ファイルのアップロード機能が利用できません。ネットワークをご確認ください。');
                }

                inputPayload = {
                  video_url: uploadedVideoUrl,
                  audio_url: lipSyncAudioUrl
                };
                if (targetEndpoint.includes('sync-lipsync')) {
                  inputPayload.sync_mode = 'cut_off';
                }
              } else {
                // Image LipSync & Motion
                let uploadedImageUrl = imgDataUrl;
                if (imgFile && falClient.storage && typeof falClient.storage.upload === 'function') {
                  try {
                    uploadedImageUrl = await falClient.storage.upload(imgFile);
                  } catch (uErr) {
                    console.warn('Image storage upload fallback to DataURL:', uErr);
                  }
                }

                if (targetEndpoint === 'bytedance/omnihuman/v2') {
                  // ByteDance OmniHuman 2.0 (2026-10-15 Latest): Accepts image_url, audio_url, optional prompt
                  inputPayload = {
                    image_url: uploadedImageUrl,
                    audio_url: lipSyncAudioUrl,
                    prompt: promptText || null
                  };
                } else if (targetEndpoint === 'fal-ai/sync-lipsync/v3/image-to-video') {
                  // Sync-3 Avatar Image-to-Video (2026-06 Latest): Accepts image_url, audio_url
                  inputPayload = {
                    image_url: uploadedImageUrl,
                    audio_url: lipSyncAudioUrl
                  };
                } else if (targetEndpoint === 'mirage-api/avatar-x/reference-to-video') {
                  // Mirage Avatar X (2026-08 Latest): Accepts image_reference_url, audio_url
                  inputPayload = {
                    image_reference_url: uploadedImageUrl,
                    audio_url: lipSyncAudioUrl
                  };
                } else if (targetEndpoint.includes('minimax/h3-max/lip-sync')) {
                  // MiniMax H3 Max Lip-Sync
                  inputPayload = {
                    image_url: uploadedImageUrl,
                    audio_url: lipSyncAudioUrl,
                    resolution: (selectedOutputResolution === '1080p') ? '1080P' : '768P',
                    enable_transcription: true
                  };
                } else if (targetEndpoint === 'kling/v4/image-to-video') {
                  // Kling 4.0 Image-to-Video (2026-10-16 Latest): Accepts start_image_url, end_image_url, prompt, duration (int), resolution
                  const k4DurInt = Math.max(3, Math.min(30, Math.round(trimDur)));
                  inputPayload = {
                    start_image_url: uploadedImageUrl,
                    prompt: promptText,
                    duration: k4DurInt,
                    resolution: (selectedOutputResolution === '1080p') ? '1080p' : '720p'
                  };
                  if (enableIdentityLock) {
                    inputPayload.end_image_url = uploadedImageUrl;
                  }
                } else if (targetEndpoint.includes('kling-video/v3/')) {
                  const klingDurStr = String(Math.max(3, Math.min(15, Math.round(trimDur))));
                  inputPayload = {
                    start_image_url: uploadedImageUrl,
                    prompt: promptText,
                    duration: klingDurStr,
                    generate_audio: false
                  };
                  if (enableIdentityLock) {
                    inputPayload.end_image_url = uploadedImageUrl;
                  }
                } else if (targetEndpoint.includes('omnihuman')) {
                  // OmniHuman v1.5 fallback
                  inputPayload = {
                    image_url: uploadedImageUrl,
                    audio_url: lipSyncAudioUrl,
                    prompt: promptText,
                    resolution: (trimDur > 30) ? '720p' : (selectedOutputResolution || '720p'),
                    turbo_mode: false
                  };
                } else {
                  // Kling AI Avatar v2 Pro / Standard & others
                  inputPayload = {
                    image_url: uploadedImageUrl,
                    prompt: promptText
                  };
                  if (lipSyncAudioUrl && selectedV11bMode !== 'video') {
                    inputPayload.audio_url = lipSyncAudioUrl;
                  }
                }
              }

              showAiStatus(`🚀 <strong>最新「${selectedV11bLabel}」で完成サイズ「${targetDim.label}」のAI動画を生成中です... (${elapsedSec}秒経過)</strong><br><small style="color:#cbd5e1;">※ 顔が崩れないよう保護ロックを適用して描画しています（約1〜3分）。この画面のままお待ちください。</small>`, '#c084fc');

              let result = null;
              try {
                result = await falClient.subscribe(targetEndpoint, {
                  input: inputPayload,
                  logs: true,
                  onQueueUpdate: (statusUpdate) => {
                    if (!statusUpdate) return;
                    if (statusUpdate.status === 'IN_QUEUE') {
                      const pos = (typeof statusUpdate.queue_position === 'number') ? ` (順番: ${statusUpdate.queue_position + 1}番目)` : '';
                      showAiStatus(`⏳ <strong>「${selectedV11bLabel}」の生成キューに並びました${pos}... (${elapsedSec}秒経過)</strong><br><small style="color:#cbd5e1;">完成サイズ: ${targetDim.label} / まもなくAI描画が始まります。</small>`, '#38bdf8');
                    } else if (statusUpdate.status === 'IN_PROGRESS') {
                      showAiStatus(`🎤 <strong>「${selectedV11bLabel}」が元の顔を維持しながら口元を同期描画しています... (${elapsedSec}秒経過)</strong><br><small style="color:#cbd5e1;">完成サイズ: ${targetDim.label} / 完成まであと少しです。</small>`, '#ec4899');
                    }
                  }
                });
              } catch (primaryModelErr) {
                // Automatic resilience fallback if a brand-new endpoint has temporary queue issues
                if (targetEndpoint === 'bytedance/omnihuman/v2') {
                  console.warn('OmniHuman 2.0 retry with Sync-3 Avatar Image-to-Video:', primaryModelErr);
                  result = await falClient.subscribe('fal-ai/sync-lipsync/v3/image-to-video', {
                    input: {
                      image_url: inputPayload.image_url,
                      audio_url: inputPayload.audio_url
                    },
                    logs: true
                  });
                } else if (targetEndpoint === 'kling/v4/image-to-video') {
                  console.warn('Kling 4.0 retry with Kling 3.0 Pro:', primaryModelErr);
                  result = await falClient.subscribe('fal-ai/kling-video/v3/pro/image-to-video', {
                    input: {
                      start_image_url: inputPayload.start_image_url,
                      end_image_url: inputPayload.end_image_url,
                      prompt: promptText,
                      duration: String(Math.max(3, Math.min(15, Math.round(trimDur)))),
                      generate_audio: false
                    },
                    logs: true
                  });
                } else {
                  throw primaryModelErr;
                }
              }

              const resData = (result && result.data) ? result.data : result;
              finalVideoUrl = (resData && resData.video && resData.video.url) || (resData && resData.video_url) || '';
            }

            // =========================================================================
            // 🎵 【仕上げ】ボーカル分離または穏やか音量ロックで口パクさせた映像に「元の100%高音質楽曲」を再合成
            // =========================================================================
            if (finalVideoUrl && uploadedOriginalAudioUrl && (didSeparateVocals || enableIdentityLock || selectedV11bMode === 'video')) {
              try {
                showAiStatus(`🎵 <strong>[仕上げ] 完成した映像に「元の100%高音質・伴奏入り楽曲」を合体しています... (${elapsedSec}秒経過)</strong><br><small style="color:#6ee7b7;">顔は穏やかで綺麗に保たれたまま、音楽は元の迫力ある高音質サウンドになります！</small>`, '#10b981');
                const mergeRes = await falClient.subscribe('fal-ai/ffmpeg-api/merge-audio-video', {
                  input: {
                    video_url: finalVideoUrl,
                    audio_url: uploadedOriginalAudioUrl,
                    start_offset: 0
                  },
                  logs: true
                });
                const mergeData = (mergeRes && mergeRes.data) ? mergeRes.data : mergeRes;
                const mergedVideoUrl = (mergeData && mergeData.video && mergeData.video.url) || (mergeData && mergeData.video_url) || '';
                if (mergedVideoUrl) {
                  finalVideoUrl = mergedVideoUrl;
                }
              } catch (mergeErr) {
                console.warn('FFmpeg audio-video merge skipped, using generated video directly:', mergeErr);
              }
            }
          }
        } catch (sdkErr) {
          console.warn('Fal client SDK notice, checking error or trying direct REST:', sdkErr);
          const status = sdkErr && (sdkErr.status || (sdkErr.body && sdkErr.body.status));
          const detailRaw = (sdkErr && sdkErr.body && (sdkErr.body.detail || sdkErr.body.message)) || (sdkErr && sdkErr.message) || '';
          const detailMsg = (typeof detailRaw === 'string') ? detailRaw : JSON.stringify(detailRaw);

          if (status === 401 || /unauthorized|invalid.*key/i.test(detailMsg)) {
            throw new Error('APIキーが無効です（401エラー）。Fal.ai の Keys ページで発行した正しいキーかご確認ください。');
          }
          if (status === 402 || status === 403 || /balance|credit|exhausted|billing|payment/i.test(detailMsg)) {
            throw new Error(`Fal.ai のクレジット残高が不足しているか、利用制限です（${detailMsg || 'Billingページでチャージをご確認ください'}）。`);
          }
          if (status === 422 || status === 400) {
            throw new Error(`AIモデル入力エラー (${status}): ${detailMsg || '秒数を15秒前後にするか、別のモデルでお試しください。'}`);
          }
          if (sdkConnected && status) {
            throw new Error(`Fal.ai APIエラー (${status}): ${detailMsg}`);
          }

          // Try direct REST fallback only if SDK import itself failed (for image mode)
          if (!finalVideoUrl && !isVideoToVideo) {
            const payload = {
              image_url: imgDataUrl,
              prompt: promptText,
              audio_url: audioDataUrl
            };
            const response = await fetch(`https://fal.run/${selectedV11bModel}`, {
              method: 'POST',
              headers: {
                'Authorization': `Key ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(payload)
            });
            if (!response.ok) {
              let errText = '';
              try {
                const errJson = await response.json();
                errText = errJson.detail || errJson.message || JSON.stringify(errJson);
              } catch (e) {
                errText = `HTTP ${response.status}`;
              }
              if (response.status === 401) {
                throw new Error('APIキーが正しくありません（401 Unauthorized）。Fal.aiのキーを再確認してください。');
              } else if (response.status === 402 || response.status === 403) {
                throw new Error(`Fal.ai のクレジット残高不足、または権限エラーです（${errText}）。fal.ai/dashboard/billing で残高をご確認ください。`);
              } else {
                throw new Error(`Fal.ai APIエラー (${response.status}): ${errText}`);
              }
            }
            const data = await response.json();
            finalVideoUrl = (data && data.video && data.video.url) || (data && data.video_url) || '';
          }
        }

        if (!finalVideoUrl) {
          throw new Error('動画URLが返されませんでした。秒数を短く（10〜15秒）するか、別のモデルでお試しください。');
        }

        await handleCompletedAiVideo(finalVideoUrl, selectedV11bLabel);
      } catch (err) {
        console.error('Fal.ai Lip-Sync generation error:', err);
        const msg = (err && err.message) ? err.message : '通信エラーが発生しました';
        showAiStatus(`❌ <strong>生成エラー：${msg}</strong><br><small style="color:#fde047;">※ APIキーの入力ミスや、Fal.ai のクレジット残高（fal.ai/dashboard/billing）をご確認ください。</small>`, '#ef4444');
        showToast(`❌ エラー: ${msg}`);
      } finally {
        if (progressTimer) clearInterval(progressTimer);
        generateAiLipsyncBtn.disabled = false;
        generateAiLipsyncBtn.innerHTML = originalBtnHtml;
      }
    });
  }

  // Direct MP4 AI Video File Import onto Stage
  if (aiVideoFileInput) {
    aiVideoFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      triggerHaptic();
      const vidUrl = URL.createObjectURL(file);
      const vidEl = document.createElement('video');
      vidEl.src = vidUrl;
      vidEl.loop = true;
      vidEl.muted = true;
      vidEl.playsInline = true;
      vidEl.setAttribute('playsinline', '');
      vidEl.onloadeddata = () => {
        vidEl.play().catch(() => {});
        characterRenderer.setAiVideo(vidEl);
        characterRenderer.aiMotionActive = true;
        characterRenderer.aiModelBadge = '取り込みAI動画 (MP4)';
        if (aiResultCard && inlineAiResultVideo) {
          inlineAiResultVideo.src = vidUrl;
          aiResultCard.classList.remove('hidden');
        }
        showAiStatus(`🎬 スマホ内の動画「${file.name}」を読み込みました！`, '#10b981');
        showToast(`🎬 AI動画「${file.name}」をセットしました！`);
      };
    });
  }

  refreshApiKeyStatusBadges();

  // ==========================================
  // Quick Trimmed Audio Downloader in Studio (STEP 3)
  // ==========================================
  const quickDownloadTrimmedBtn = document.getElementById('quickDownloadTrimmedBtn');

  // Audio Complete Modal Elements (Studio STEP 3)
  const audioCompleteModal = document.getElementById('audioCompleteModal');
  const closeAudioModalCrossBtn = document.getElementById('closeAudioModalCrossBtn');
  const closeAudioModalBottomBtn = document.getElementById('closeAudioModalBottomBtn');
  const completeAudioPreview = document.getElementById('completeAudioPreview');
  const modalAudioFileName = document.getElementById('modalAudioFileName');
  const modalAudioFormatBadge = document.getElementById('modalAudioFormatBadge');
  const modalAudioMeta = document.getElementById('modalAudioMeta');
  const saveAudioToPhoneBtn = document.getElementById('saveAudioToPhoneBtn');
  const directAudioDownloadBtn = document.getElementById('directAudioDownloadBtn');
  const directLyricsDownloadBtn = document.getElementById('directLyricsDownloadBtn');
  const copyStudioLyricsBtn = document.getElementById('copyStudioLyricsBtn');
  const modalStudioLyricsCard = document.getElementById('modalStudioLyricsCard');
  const modalStudioLyricsPreview = document.getElementById('modalStudioLyricsPreview');
  const modalAudioDirectLink = document.getElementById('modalAudioDirectLink');

  // Format Switcher & Quick Save Buttons (v12.3)
  const quickDownloadMp3Btn = document.getElementById('quickDownloadMp3Btn');
  const quickDownloadWavBtn = document.getElementById('quickDownloadWavBtn');
  const modalFormatMp3Btn = document.getElementById('modalFormatMp3Btn');
  const modalFormatWavBtn = document.getElementById('modalFormatWavBtn');
  const modalFormatExplainer = document.getElementById('modalFormatExplainer');
  const saveAudioBtnText = document.getElementById('saveAudioBtnText');
  const directAudioBtnText = document.getElementById('directAudioBtnText');

  let currentCutFormat = 'mp3'; // 'mp3' or 'wav'
  let cutMp3Blob = null;
  let cutMp3File = null;
  let cutMp3Filename = '';
  let cutWavBlob = null;
  let cutWavFile = null;
  let cutWavFilename = '';

  let lastCutAudioBlob = null;
  let lastCutAudioFile = null;
  let lastCutAudioFilename = '';
  let lastCutAudioUrl = null;

  let lastCutLyricsBlob = null;
  let lastCutLyricsFile = null;
  let lastCutLyricsFilename = '';
  let lastCutLyricsText = '';

  function sliceBufferDirect(srcBuffer, startSec, endSec) {
    const ctx = audioEngine.ctx || new (window.AudioContext || window.webkitAudioContext)();
    audioEngine.ctx = ctx;
    const sampleRate = srcBuffer.sampleRate;
    const numChannels = srcBuffer.numberOfChannels;
    const startSample = Math.max(0, Math.floor(startSec * sampleRate));
    const endSample = Math.min(srcBuffer.length, Math.floor(endSec * sampleRate));
    const length = Math.max(1, endSample - startSample);
    const sliced = ctx.createBuffer(numChannels, length, sampleRate);
    for (let c = 0; c < numChannels; c++) {
      const srcData = srcBuffer.getChannelData(c).subarray(startSample, endSample);
      sliced.getChannelData(c).set(srcData);
    }
    return sliced;
  }

  function encodeWavDirect(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const blockAlign = numChannels * 2;
    const dataByteLength = buffer.length * blockAlign;
    const totalLength = 44 + dataByteLength;
    const arrayBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(arrayBuffer);

    function writeStr(offset, str) {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    }

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataByteLength, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, dataByteLength, true);

    const channels = [];
    for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let c = 0; c < numChannels; c++) {
        let s = Math.max(-1, Math.min(1, channels[c][i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
      }
    }
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  function encodeMp3Direct(buffer) {
    if (typeof lamejs === 'undefined') return encodeWavDirect(buffer);
    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const encoder = new lamejs.Mp3Encoder(channels, sampleRate, 192);
    const chunks = [];
    const len = buffer.length;
    const leftRaw = buffer.getChannelData(0);
    const rightRaw = channels > 1 ? buffer.getChannelData(1) : leftRaw;
    const leftInt = new Int16Array(len);
    const rightInt = new Int16Array(len);
    for (let i = 0; i < len; i++) {
      const l = Math.max(-1, Math.min(1, leftRaw[i]));
      leftInt[i] = l < 0 ? l * 0x8000 : l * 0x7FFF;
      const r = Math.max(-1, Math.min(1, rightRaw[i]));
      rightInt[i] = r < 0 ? r * 0x8000 : r * 0x7FFF;
    }
    const blockSize = 1152;
    for (let i = 0; i < len; i += blockSize) {
      const l = leftInt.subarray(i, i + blockSize);
      const r = rightInt.subarray(i, i + blockSize);
      const mp3buf = (channels === 1) ? encoder.encodeBuffer(l) : encoder.encodeBuffer(l, r);
      if (mp3buf.length > 0) chunks.push(mp3buf);
    }
    const end = encoder.flush();
    if (end.length > 0) chunks.push(end);
    return new Blob(chunks, { type: 'audio/mpeg' });
  }

  function triggerDirectAudioDownload(blob, filename) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); } catch (e) {}
      }, 1000);
      setTimeout(() => {
        try { URL.revokeObjectURL(url); } catch (e) {}
      }, 60000);
    } catch (e) {
      console.warn('triggerDirectAudioDownload failed:', e);
    }
  }

  function buildStudioLyricsText(songConfig, trimStart, trimEnd) {
    const durSec = Math.max(1, Math.round(trimEnd - trimStart));
    const startStr = formatTime(trimStart);
    const endStr = formatTime(trimEnd);
    const dateStr = new Date().toLocaleDateString('ja-JP');

    const title = (songConfig && songConfig.title) ? songConfig.title : '楽曲';
    const genre = (songConfig && songConfig.genre) ? songConfig.genre : '';
    const bpm = (songConfig && songConfig.bpm) ? songConfig.bpm : null;
    const isCustom = !songConfig || songConfig.id === 'custom';

    let text = `========================================\n`;
    text += `【楽曲情報】\n`;
    text += `曲名: ${title}\n`;
    if (genre) text += `ジャンル: ${genre}\n`;
    if (bpm) text += `BPM: ${bpm}\n`;
    text += `切り出し区間: ${startStr} 〜 ${endStr} (${durSec}秒間)\n`;
    text += `========================================\n\n`;

    if (songConfig && songConfig.lyrics && songConfig.lyrics.length > 0 && !isCustom) {
      const trimmedLyrics = songConfig.lyrics.filter(l => l.time >= trimStart && l.time <= trimEnd);
      text += `【✂️ 切り出し区間の歌詞】\n`;
      if (trimmedLyrics.length > 0) {
        trimmedLyrics.forEach(l => {
          const relSec = Math.max(0, l.time - trimStart);
          text += `[${formatTime(relSec)}] (原曲 ${formatTime(l.time)}) ${l.text}\n`;
        });
      } else {
        const active = songConfig.lyrics.slice().reverse().find(l => l.time <= trimStart) || songConfig.lyrics[0];
        text += `[00:00] (原曲 ${formatTime(active.time)}) ${active.text}\n`;
      }
      text += `\n----------------------------------------\n`;
      text += `【🎵 曲全体の歌詞一覧】\n`;
      songConfig.lyrics.forEach(l => {
        text += `[${formatTime(l.time)}] ${l.text}\n`;
      });
    } else {
      text += `【✂️ 切り出し区間の歌詞 / テロップメモ】\n`;
      text += `※ご自身のオリジナル持ち込み音源です。\n`;
      text += `動画編集（CapCut等）やSNS投稿時の歌詞・テロップメモとして自由にご編集ください。\n\n`;
      text += `[00:00] （ここに歌詞やテロップを入力）\n`;
    }

    text += `\n========================================\n`;
    text += `作成日: ${dateStr}\n`;
    text += `GrooveSync MV Studio\n`;
    text += `========================================\n`;
    return text;
  }

  function updateModalFormatUI(format) {
    currentCutFormat = format;
    const isWav = format === 'wav';

    // Tab buttons active states
    if (modalFormatMp3Btn) {
      modalFormatMp3Btn.style.background = isWav ? 'transparent' : '#10b981';
      modalFormatMp3Btn.style.color = isWav ? '#94a3b8' : '#fff';
      modalFormatMp3Btn.style.boxShadow = isWav ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.4)';
    }
    if (modalFormatWavBtn) {
      modalFormatWavBtn.style.background = isWav ? '#3b82f6' : 'transparent';
      modalFormatWavBtn.style.color = isWav ? '#fff' : '#94a3b8';
      modalFormatWavBtn.style.boxShadow = isWav ? '0 2px 8px rgba(59, 130, 246, 0.4)' : 'none';
    }

    if (modalFormatExplainer) {
      modalFormatExplainer.textContent = isWav ? 'WAV: 最高音質（非圧縮PCM）' : 'MP3: 軽量（192kbps高音質）';
    }

    const activeBlob = isWav ? cutWavBlob : cutMp3Blob;
    const activeFile = isWav ? cutWavFile : cutMp3File;
    const activeFilename = isWav ? cutWavFilename : cutMp3Filename;

    lastCutAudioBlob = activeBlob;
    lastCutAudioFile = activeFile;
    lastCutAudioFilename = activeFilename;

    if (lastCutAudioUrl) {
      try { URL.revokeObjectURL(lastCutAudioUrl); } catch (e) {}
    }
    if (activeBlob) {
      lastCutAudioUrl = URL.createObjectURL(activeBlob);
    }

    if (modalAudioFileName) modalAudioFileName.textContent = activeFilename;
    if (modalAudioFormatBadge) {
      modalAudioFormatBadge.textContent = isWav ? 'WAV' : 'MP3';
      modalAudioFormatBadge.style.background = isWav ? 'rgba(59, 130, 246, 0.25)' : 'rgba(16, 185, 129, 0.25)';
      modalAudioFormatBadge.style.color = isWav ? '#93c5fd' : '#6ee7b7';
      modalAudioFormatBadge.style.borderColor = isWav ? '#3b82f6' : '#10b981';
    }

    if (modalAudioMeta && activeBlob) {
      const dur = Math.max(1, Math.round(audioEngine.trimEnd - audioEngine.trimStart));
      const sizeStr = isWav ? `${(activeBlob.size / (1024 * 1024)).toFixed(2)} MB` : `${(activeBlob.size / 1024).toFixed(1)} KB`;
      const qualityStr = isWav ? '最高音質・無劣化' : '192kbps高音質・軽量';
      modalAudioMeta.textContent = `区間: ${formatTime(audioEngine.trimStart)} 〜 ${formatTime(audioEngine.trimEnd)} (${dur}秒間) | 容量: ${sizeStr} (${qualityStr})`;
    }

    if (completeAudioPreview && lastCutAudioUrl) {
      completeAudioPreview.src = lastCutAudioUrl;
      completeAudioPreview.load();
    }

    if (modalAudioDirectLink) {
      modalAudioDirectLink.href = lastCutAudioUrl || '#';
      modalAudioDirectLink.download = activeFilename;
    }

    if (saveAudioBtnText) {
      saveAudioBtnText.textContent = `切り出し音声(${isWav ? 'WAV' : 'MP3'})をスマホに保存 / 共有`;
    }
    if (saveAudioToPhoneBtn) {
      saveAudioToPhoneBtn.style.background = isWav
        ? 'linear-gradient(135deg, #3b82f6, #06b6d4)'
        : 'linear-gradient(135deg, #10b981, #06b6d4)';
      saveAudioToPhoneBtn.style.borderColor = isWav ? '#60a5fa' : '#34d399';
    }
    if (directAudioBtnText) {
      directAudioBtnText.textContent = `${isWav ? 'WAV' : 'MP3'}ファイルを直接ダウンロード`;
    }
  }

  function openCutAudioModal(initialFormat = 'mp3', trimStart = 0, trimEnd = 15) {
    if (!audioCompleteModal) return;
    if (audioEngine && audioEngine.isPlaying) {
      audioEngine.pause();
      updatePlayUI(false);
    }

    // Build Lyrics Data & Text File (Pattern A)
    const effectiveSong = currentSongConfig || (typeof GROOVE_PRESETS !== 'undefined' && GROOVE_PRESETS.songs ? GROOVE_PRESETS.songs.jpop : null);
    lastCutLyricsText = buildStudioLyricsText(effectiveSong, trimStart, trimEnd);
    const songTitle = (currentSongConfig && currentSongConfig.title) ? currentSongConfig.title : 'song';
    lastCutLyricsFilename = `${songTitle}_歌詞.txt`;
    lastCutLyricsBlob = new Blob([lastCutLyricsText], { type: 'text/plain;charset=utf-8' });
    lastCutLyricsFile = new File([lastCutLyricsBlob], lastCutLyricsFilename, { type: 'text/plain;charset=utf-8' });

    // Populate Lyrics Preview
    if (modalStudioLyricsPreview) {
      if (effectiveSong && effectiveSong.lyrics && effectiveSong.id !== 'custom') {
        const trimmed = effectiveSong.lyrics.filter(l => l.time >= trimStart && l.time <= trimEnd);
        if (trimmed.length > 0) {
          modalStudioLyricsPreview.textContent = trimmed.map(l => {
            const rel = Math.max(0, l.time - trimStart);
            return `[${formatTime(rel)}] ${l.text}`;
          }).join('\n');
        } else {
          modalStudioLyricsPreview.textContent = `♪ ${effectiveSong.title || '音楽'} を再生中`;
        }
      } else {
        modalStudioLyricsPreview.textContent = `♪ 持ち込み音源 (${formatTime(trimStart)} 〜 ${formatTime(trimEnd)})`;
      }
    }

    // Apply the chosen initial format (MP3 or WAV)
    updateModalFormatUI(initialFormat);

    audioCompleteModal.classList.remove('hidden');
    audioCompleteModal.classList.add('visible');
    triggerHaptic();
  }

  function closeCutAudioModal() {
    triggerHaptic();
    if (completeAudioPreview) {
      try { completeAudioPreview.pause(); } catch (e) {}
    }
    if (audioCompleteModal) {
      audioCompleteModal.classList.remove('visible');
      audioCompleteModal.classList.add('hidden');
    }
  }

  async function handleAudioCutDownload(targetFormat = 'mp3') {
    triggerHaptic();

    if (!audioEngine.hasAudioLoaded()) {
      showToast('まず STEP 2 であなたの楽曲ファイルをアップロードしてください');
      return;
    }

    showToast(`✂️ カット音声を${targetFormat.toUpperCase()}で準備中...`);

    try {
      let buf = audioEngine.ensureAudioBuffer();
      if (!buf) {
        const ctx = audioEngine.ctx || new (window.AudioContext || window.webkitAudioContext)();
        buf = ctx.createBuffer(2, ctx.sampleRate * 15, ctx.sampleRate);
      }

      const sliced = sliceBufferDirect(buf, audioEngine.trimStart, audioEngine.trimEnd);
      const songTitle = (currentSongConfig && currentSongConfig.title) ? currentSongConfig.title : 'song';
      const timeTag = `${formatTime(audioEngine.trimStart).replace(':', 'm')}s-${formatTime(audioEngine.trimEnd).replace(':', 'm')}s`;

      // Pre-encode both MP3 and WAV so user can toggle between them instantly in the modal
      cutMp3Blob = encodeMp3Direct(sliced);
      cutMp3Filename = `${songTitle}_cut_${timeTag}.mp3`;
      cutMp3File = new File([cutMp3Blob], cutMp3Filename, { type: 'audio/mpeg' });

      cutWavBlob = encodeWavDirect(sliced);
      cutWavFilename = `${songTitle}_cut_${timeTag}.wav`;
      cutWavFile = new File([cutWavBlob], cutWavFilename, { type: 'audio/wav' });

      openCutAudioModal(targetFormat, audioEngine.trimStart, audioEngine.trimEnd);
      showToast(`✂️ 「${targetFormat === 'wav' ? cutWavFilename : cutMp3Filename}」を切り出しました！`);

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (!isMobile) {
        const activeBlob = targetFormat === 'wav' ? cutWavBlob : cutMp3Blob;
        const activeName = targetFormat === 'wav' ? cutWavFilename : cutMp3Filename;
        triggerDirectAudioDownload(activeBlob, activeName);
      }
    } catch (err) {
      console.error('Quick download failed:', err);
      showToast('切り出し保存に失敗しました。専用カッターツールもお試しください');
    }
  }

  // Register Section 3 Save Buttons
  if (quickDownloadMp3Btn) {
    quickDownloadMp3Btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleAudioCutDownload('mp3');
    });
  }
  if (quickDownloadWavBtn) {
    quickDownloadWavBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleAudioCutDownload('wav');
    });
  }
  if (quickDownloadTrimmedBtn) {
    quickDownloadTrimmedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleAudioCutDownload('mp3');
    });
  }

  // Register Modal Format Switch Tabs
  if (modalFormatMp3Btn) {
    modalFormatMp3Btn.addEventListener('click', () => {
      triggerHaptic();
      updateModalFormatUI('mp3');
      showToast('🎵 MP3形式（軽量）に切り替えました');
    });
  }
  if (modalFormatWavBtn) {
    modalFormatWavBtn.addEventListener('click', () => {
      triggerHaptic();
      updateModalFormatUI('wav');
      showToast('💎 WAV形式（最高音質）に切り替えました');
    });
  }

  // Audio Complete Modal Event Listeners (Pattern A: Audio + Lyrics .txt)
  if (copyStudioLyricsBtn) {
    copyStudioLyricsBtn.addEventListener('click', async () => {
      triggerHaptic();
      if (!lastCutLyricsText) return;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(lastCutLyricsText);
          showToast('✔ 歌詞テキストをクリップボードにコピーしました！');
        } else {
          const ta = document.createElement('textarea');
          ta.value = lastCutLyricsText;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          showToast('✔ 歌詞テキストをコピーしました！');
        }
      } catch (e) {
        console.warn('Clipboard copy failed:', e);
        showToast('コピーに失敗しました。プレビューから直接選択してコピーしてください');
      }
    });
  }

  if (directLyricsDownloadBtn) {
    directLyricsDownloadBtn.addEventListener('click', () => {
      triggerHaptic();
      if (!lastCutLyricsBlob || !lastCutLyricsFilename) return;
      triggerDirectAudioDownload(lastCutLyricsBlob, lastCutLyricsFilename);
      showToast('歌詞テキスト（.txt）のダウンロードを開始しました');
    });
  }

  if (saveAudioToPhoneBtn) {
    saveAudioToPhoneBtn.addEventListener('click', async () => {
      triggerHaptic();
      if (!lastCutAudioFile) return;

      // Share both Audio (MP3/WAV) and Lyrics TXT files together (Pattern A)
      const filesToShare = [lastCutAudioFile, lastCutLyricsFile].filter(Boolean);
      const shareData = {
        files: filesToShare
      };

      const fmtLabel = (currentCutFormat || 'mp3').toUpperCase();

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          showToast(`共有メニューを開きました。「"ファイル"に保存」で${fmtLabel}と歌詞が同時に保存されます`);
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.warn('Dual-file share failed, trying audio-only share:', err);
        }
      }

      // Fallback 1: Share audio file alone
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [lastCutAudioFile] })) {
        try {
          await navigator.share({ files: [lastCutAudioFile] });
          showToast(`${fmtLabel}音声を共有しました。歌詞は「歌詞を保存」ボタンから保存できます`);
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }

      // Fallback 2: Direct downloads
      triggerDirectAudioDownload(lastCutAudioBlob, lastCutAudioFilename);
      if (lastCutLyricsBlob) {
        setTimeout(() => triggerDirectAudioDownload(lastCutLyricsBlob, lastCutLyricsFilename), 600);
      }
      showToast(`${fmtLabel}音声のダウンロードを開始しました`);
    });
  }

  if (directAudioDownloadBtn) {
    directAudioDownloadBtn.addEventListener('click', () => {
      triggerHaptic();
      if (!lastCutAudioBlob) return;
      triggerDirectAudioDownload(lastCutAudioBlob, lastCutAudioFilename);
      const fmtLabel = (currentCutFormat || 'mp3').toUpperCase();
      showToast(`${fmtLabel}音声のダウンロードを開始しました`);
    });
  }

  if (modalAudioDirectLink) {
    modalAudioDirectLink.addEventListener('click', () => {
      if (lastCutAudioUrl) {
        window.open(lastCutAudioUrl, '_blank');
      }
    });
  }

  if (closeAudioModalCrossBtn) closeAudioModalCrossBtn.addEventListener('click', closeCutAudioModal);
  if (closeAudioModalBottomBtn) closeAudioModalBottomBtn.addEventListener('click', closeCutAudioModal);
  if (audioCompleteModal) {
    audioCompleteModal.addEventListener('click', (e) => {
      if (e.target === audioCompleteModal) closeCutAudioModal();
    });
  }

  // Open file picker cleanly on click / tap
  avatarUploadBtn.addEventListener('click', () => {
    triggerHaptic();
    if (avatarUploadBtn.tagName.toLowerCase() !== 'label') {
      avatarFileInput.click();
    }
  });

  avatarUploadBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerHaptic();
      avatarFileInput.click();
    }
  });

  avatarFileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    triggerHaptic();
    avatarCardTitle.textContent = `読込中: ${file.name}...`;
    avatarCardHint.textContent = '写真を最適化してMVにセットしています...';
    showToast(`写真「${file.name}」を読み込んでいます...`);

    let bitmap = null;
    let tempUrl = null;

    try {
      let processFile = file;

      // 1. HEIC conversion fallback if needed
      const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.hei[cf]$/i.test(file.name);
      if (isHeic && window.heic2any) {
        avatarCardHint.textContent = 'HEIC形式の写真を最適化しています...';
        try {
          const converted = await window.heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
          processFile = Array.isArray(converted) ? converted[0] : converted;
        } catch (convErr) {
          console.warn('heic2any conversion fallback failed, trying direct decode:', convErr);
        }
      }

      // 2. Decode image safely (createImageBitmap first, Image element fallback)
      let sourceElement = null;
      let sw = 0;
      let sh = 0;

      if (typeof window.createImageBitmap === 'function') {
        try {
          bitmap = await createImageBitmap(processFile);
          sourceElement = bitmap;
          sw = bitmap.width;
          sh = bitmap.height;
        } catch (bmErr) {
          console.warn('createImageBitmap failed, falling back to Image element:', bmErr);
        }
      }

      if (!sourceElement) {
        const img = new Image();
        try {
          tempUrl = URL.createObjectURL(processFile);
          await new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Object URL decode failed'));
            img.src = tempUrl;
          });
          sourceElement = img;
          sw = img.naturalWidth || img.width;
          sh = img.naturalHeight || img.height;
        } catch (objErr) {
          console.warn('Object URL failed, trying FileReader dataUrl:', objErr);
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('FileReader failed'));
            reader.readAsDataURL(processFile);
          });
          await new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('DataURL decode failed'));
            img.src = dataUrl;
          });
          sourceElement = img;
          sw = img.naturalWidth || img.width;
          sh = img.naturalHeight || img.height;
        }
      }

      if (!sourceElement || !sw || !sh) {
        throw new Error('画像サイズが正しく取得できませんでした');
      }

      // 3. Render into high-quality canvas preserving full photo aspect ratio
      const maxDim = 1280;
      let targetW = sw;
      let targetH = sh;
      if (sw > maxDim || sh > maxDim) {
        if (sw > sh) {
          targetW = maxDim;
          targetH = Math.round((sh * maxDim) / sw);
        } else {
          targetH = maxDim;
          targetW = Math.round((sw * maxDim) / sh);
        }
      }

      const optCanvas = document.createElement('canvas');
      optCanvas.width = targetW;
      optCanvas.height = targetH;
      const ctx = optCanvas.getContext('2d');
      ctx.drawImage(sourceElement, 0, 0, targetW, targetH);

      // Save and apply
      savedCustomAvatarCanvas = optCanvas;
      savedCustomAvatarName = file.name;
      applyCustomAvatar(optCanvas, file.name);

      showToast('🎉 あなたの写真をセットしました！');
    } catch (err) {
      console.error('Image load error:', err);
      avatarCardTitle.textContent = '写真の読み込みに失敗しました';
      avatarCardHint.textContent = 'JPGまたはPNG形式の写真をお試しください（タップして再選択）';
      showToast('写真の読み込みに失敗しました。別の写真をお試しください。');
    } finally {
      if (bitmap && typeof bitmap.close === 'function') {
        bitmap.close();
      }
      if (tempUrl) {
        URL.revokeObjectURL(tempUrl);
      }
      avatarFileInput.value = '';
    }
  });

  // ==========================================
  // User Audio File Upload (Trimming enabled)
  // ==========================================
  audioUploadBtn.addEventListener('click', () => {
    triggerHaptic();
    try {
      audioEngine.init();
      if ('audioSession' in navigator) {
        navigator.audioSession.type = 'playback';
      }
    } catch (e) {}
    if (audioUploadBtn.tagName.toLowerCase() !== 'label') {
      audioFileInput.click();
    }
  });
  audioUploadBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerHaptic();
      audioFileInput.click();
    }
  });

  // Register late duration update callback
  window.onAudioDurationResolved = (newDur) => {
    if (newDur && newDur > 0) {
      if (trimEndSeconds > newDur) {
        trimEndSeconds = Math.round(newDur * 2) / 2;
        trimDurationSeconds = Math.max(0.5, Math.round((trimEndSeconds - trimStartSeconds) * 10) / 10);
      }
      try { updateTrimmerUI(); } catch (e) {}
    }
  };

  audioFileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      if (audioUploadHint) {
        audioUploadHint.textContent = `読込中: ${file.name} (${Math.round(file.size / 1024)} KB)...`;
      }
      const res = await audioEngine.loadUserFile(file);
      if (res && res.success) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        if (controlSongTitle) controlSongTitle.textContent = cleanName;
        if (stageSongTitle) stageSongTitle.textContent = cleanName;
        audioUploadBtn.classList.add('applied');
        if (audioCardTitle) audioCardTitle.textContent = `✔ 読込完了: ${file.name}`;
        if (audioUploadHint) audioUploadHint.textContent = `全体の長さ: ${formatTime(res.duration)}（下のSTEP 3で歌わせる区間を指定してください）`;

        currentSongConfig = {
          title: cleanName,
          bpm: 120,
          lyrics: [{ time: 0, text: '♪ あなたの楽曲を再生中' }]
        };
        if (stageBpmIndicator) stageBpmIndicator.textContent = `120 BPM`;

        // Set trimmer defaults for user song (15s default for AI lip-sync)
        trimStartSeconds = 0;
        trimDurationSeconds = Math.min(res.duration || 15, 15);
        trimEndSeconds = trimStartSeconds + trimDurationSeconds;
        try {
          updateTrimmerUI();
        } catch (uiErr) {
          console.warn('updateTrimmerUI error:', uiErr);
        }

        // Safely try starting playback in full preview mode
        try {
          audioEngine.playFull(0);
          updatePlayUI(true);
          updateFullPlayerUI(true);
          showToast(`🎉 楽曲「${cleanName}」（全体 ${formatTime(res.duration)}）を読み込みました！STEP 3で歌わせる秒数を指定できます。`);
        } catch (playErr) {
          console.warn('Auto play blocked by browser policy:', playErr);
          updatePlayUI(false);
          updateFullPlayerUI(false);
          showToast(`🎉 楽曲「${cleanName}」を読み込みました！STEP 3の「▶ 曲全体を再生して秒数を確認」を押して試聴できます。`);
        }
      } else {
        const errDetail = (res && res.error) ? res.error : '端末内の音楽または録音ファイルをお試しください';
        if (audioUploadHint) {
          audioUploadHint.innerHTML = `<span style="color:#ef4444;font-weight:700;">⚠ 読込エラー: ${errDetail}</span><br><small style="color:#cbd5e1;">※iCloud上のファイルは端末にダウンロードしてから選択するか、別の曲をお試しください</small>`;
        }
        showToast(`エラー: ${errDetail}`);
      }
    } catch (err) {
      console.error('Audio load error:', err);
      const msg = (err && err.message) ? err.message : '端末の設定またはファイル形式をご確認ください';
      if (audioUploadHint) {
        audioUploadHint.innerHTML = `<span style="color:#ef4444;font-weight:700;">⚠ 読込エラー: ${msg}</span><br><small style="color:#cbd5e1;">※画面上部の【🔄 最新版】を押すか、別の曲をお試しください</small>`;
      }
      showToast('ファイルの読み込みに失敗しました');
    } finally {
      audioFileInput.value = '';
    }
  });

  // ==========================================
  // Mic Toggle (if present)
  // ==========================================
  if (micToggleBtn) {
    micToggleBtn.addEventListener('click', async () => {
      triggerHaptic();
      const active = await audioEngine.toggleMic();
      if (active) {
        micToggleBtn.classList.add('active');
        if (micBtnTitle) micBtnTitle.textContent = '🎤 マイク入力中（タップで停止）';
        showToast('マイク入力を開始しました');
      } else {
        micToggleBtn.classList.remove('active');
        if (micBtnTitle) micBtnTitle.textContent = 'スマホのマイクで歌唱テスト';
        showToast('マイク入力を停止しました');
      }
    });
  }

  // ==========================================
  // Video Recording & Download Pipeline (Canvas + Web Audio -> MP4/WebM)
  // ==========================================
  function triggerBlobDownload(blob, filename) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 20000);
    } catch (err) {
      console.warn('Auto download error:', err);
    }
  }

  function openCompleteModal(videoUrl, filename, targetDuration) {
    if (!videoCompleteModal) return;

    // Stop background audio so video's own recorded audio plays cleanly without echo
    if (audioEngine && audioEngine.isPlaying) {
      audioEngine.pause();
    }
    updatePlayUI(false);
    updateFullPlayerUI(false);

    if (completeVideoPreview) {
      completeVideoPreview.src = videoUrl;
      completeVideoPreview.load();
    }

    if (modalDownloadLink) {
      modalDownloadLink.href = videoUrl;
      modalDownloadLink.download = filename;
    }

    videoCompleteModal.classList.remove('hidden');
    videoCompleteModal.classList.add('visible');
    triggerHaptic();
  }

  function closeCompleteModal() {
    triggerHaptic();
    if (completeVideoPreview) {
      completeVideoPreview.pause();
    }
    if (audioEngine && audioEngine.isPlaying) {
      audioEngine.pause();
    }
    if (videoCompleteModal) {
      videoCompleteModal.classList.remove('visible');
      videoCompleteModal.classList.add('hidden');
    }
  }

  function resetRecordingUI(targetDuration) {
    isRecording = false;
    clearInterval(recordTimer);
    recordTimer = null;
    if (healthCheckTimer) {
      clearTimeout(healthCheckTimer);
      healthCheckTimer = null;
    }
    mainRecordBtn.classList.remove('recording');
    stageRecordBtn.classList.remove('recording');
    finalRecordBtn.classList.remove('recording');

    mainRecText.textContent = 'MVを録画・保存';
    finalRecText.textContent = `● この長さ（${targetDuration}秒）でMVを録画して保存`;
  }

  let healthCheckTimer = null;

  function startRecording() {
    if (isRecording) return;

    if (!characterRenderer.customAvatarImg) {
      showToast('まず STEP 1 であなたの写真をアップロードしてください');
      return;
    }
    if (!audioEngine.hasAudioLoaded()) {
      showToast('まず STEP 2 であなたの楽曲ファイルをアップロードしてください');
      return;
    }

    const targetDuration = Math.round(trimDurationSeconds);

    // Make sure audio is playing from start of trim
    audioEngine.pause();
    audioEngine.pauseOffset = 0;
    audioEngine.playTrim();
    updatePlayUI(true);
    updateFullPlayerUI(false);

    try {
      const getCanvasStream = () => {
        // Use 25fps for maximum stability on mobile WebKit/iOS
        if (typeof stageCanvas.captureStream === 'function') {
          return stageCanvas.captureStream(25);
        }
        if (typeof stageCanvas.webkitCaptureStream === 'function') {
          return stageCanvas.webkitCaptureStream(25);
        }
        return null;
      };

      const canvasStream = getCanvasStream();
      if (!canvasStream) {
        showToast('お使いの環境では画面録画がサポートされていません');
        return;
      }

      // Check MIME type support with priority to standard video/mp4 (cleanest on iOS)
      const mimeCandidates = [
        { type: 'video/mp4', ext: 'mp4' },
        { type: 'video/mp4;codecs=avc1', ext: 'mp4' },
        { type: 'video/webm;codecs=vp9,opus', ext: 'webm' },
        { type: 'video/webm;codecs=vp8,opus', ext: 'webm' },
        { type: 'video/webm', ext: 'webm' }
      ];

      let selectedMimeType = '';
      let fileExt = 'mp4';

      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        for (const cand of mimeCandidates) {
          if (MediaRecorder.isTypeSupported(cand.type)) {
            selectedMimeType = cand.type;
            fileExt = cand.ext;
            break;
          }
        }
      }

      const canvasTracks = canvasStream.getVideoTracks();
      let audioTracks = [];
      try {
        if (audioEngine && audioEngine.recDestination && audioEngine.recDestination.stream) {
          audioTracks = audioEngine.recDestination.stream.getAudioTracks();
        }
      } catch (e) {
        audioTracks = [];
      }

      // Primary stream: attempt canvas + audio track
      let primaryStream;
      if (canvasTracks.length > 0 && audioTracks.length > 0) {
        try {
          primaryStream = new MediaStream([canvasTracks[0], audioTracks[0]]);
        } catch (e) {
          primaryStream = canvasStream;
        }
      } else {
        primaryStream = canvasStream;
      }

      function createRecorder(stream) {
        let rec = null;
        let mime = selectedMimeType;
        try {
          rec = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
        } catch (err1) {
          console.warn('MediaRecorder with mimeType failed, falling back to default options:', err1);
          try {
            rec = new MediaRecorder(stream);
            mime = rec.mimeType || 'video/mp4';
          } catch (err2) {
            console.warn('MediaRecorder failed on stream, falling back to canvasStream:', err2);
            rec = new MediaRecorder(canvasStream);
            mime = rec.mimeType || 'video/mp4';
          }
        }
        return { recorder: rec, mimeType: mime };
      }

      let { recorder: currentRecorder, mimeType: activeMime } = createRecorder(primaryStream);
      mediaRecorder = currentRecorder;

      recordedChunks = [];
      let totalRecordedBytes = 0;

      const handleDataAvailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
          totalRecordedBytes += e.data.size;
        }
      };

      mediaRecorder.ondataavailable = handleDataAvailable;

      const finalizeRecording = () => {
        audioEngine.pause();
        updatePlayUI(false);
        updateFullPlayerUI(false);
        resetRecordingUI(targetDuration);

        if (!recordedChunks || recordedChunks.length === 0 || totalRecordedBytes === 0) {
          showToast('録画データが空でした。もう一度お試しください');
          return;
        }

        const mime = activeMime || selectedMimeType || (fileExt === 'mp4' ? 'video/mp4' : 'video/webm');
        const blob = new Blob(recordedChunks, { type: mime });
        if (lastRecordedUrl) {
          try { URL.revokeObjectURL(lastRecordedUrl); } catch (e) {}
        }
        const videoUrl = URL.createObjectURL(blob);
        const songTitle = (currentSongConfig && currentSongConfig.title) ? currentSongConfig.title : 'MySong';
        const songNameClean = songTitle.replace(/[\s\/\\?%*:|"<>]+/g, '_');
        const filename = `GrooveSync_${songNameClean}_${targetDuration}s.${fileExt}`;

        lastRecordedBlob = blob;
        lastRecordedUrl = videoUrl;
        lastRecordedFilename = filename;
        try {
          lastRecordedFile = new File([blob], filename, { type: mime });
        } catch (e) {
          lastRecordedFile = null;
        }

        openCompleteModal(videoUrl, filename, targetDuration);
        showToast('動画が完成しました！保存・プレビュー画面をご確認ください');
      };

      mediaRecorder.onstop = () => {
        // Wait 350ms to ensure WebKit completely dispatches the final ondataavailable chunk
        setTimeout(finalizeRecording, 350);
      };

      // Start recording with 500ms timeslice to flush buffer frequently
      mediaRecorder.start(500);
      isRecording = true;
      mainRecordBtn.classList.add('recording');
      stageRecordBtn.classList.add('recording');
      finalRecordBtn.classList.add('recording');

      let elapsed = 0;
      mainRecText.textContent = `録画中... (${targetDuration}秒)`;
      finalRecText.textContent = `録画中... 残り ${targetDuration} 秒`;

      // Early Safety Health Check (at 1.6s)
      // Detects iOS WebKit canvas+audio 0-byte issue and seamlessly recovers before wasting time
      if (healthCheckTimer) clearTimeout(healthCheckTimer);
      healthCheckTimer = setTimeout(() => {
        if (!isRecording) return;
        if (totalRecordedBytes === 0 && primaryStream !== canvasStream) {
          console.warn('Primary stream produced 0 bytes (iOS WebKit audio track issue). Seamlessly switching to pure canvas stream.');
          try {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
              mediaRecorder.ondataavailable = null;
              mediaRecorder.onstop = null;
              mediaRecorder.stop();
            }
          } catch (e) {}

          const fallback = createRecorder(canvasStream);
          mediaRecorder = fallback.recorder;
          activeMime = fallback.mimeType;
          recordedChunks = [];
          totalRecordedBytes = 0;

          mediaRecorder.ondataavailable = handleDataAvailable;
          mediaRecorder.onstop = () => {
            setTimeout(finalizeRecording, 350);
          };

          mediaRecorder.start(500);
          console.log('Fallback canvas recorder running successfully');
        }
      }, 1600);

      clearInterval(recordTimer);
      recordTimer = setInterval(() => {
        elapsed += 1;
        const remaining = Math.max(0, targetDuration - elapsed);
        mainRecText.textContent = `録画中... (残り${remaining}秒)`;
        finalRecText.textContent = `録画中... 残り ${remaining} 秒`;

        if (elapsed >= targetDuration) {
          clearInterval(recordTimer);
          if (healthCheckTimer) {
            clearTimeout(healthCheckTimer);
            healthCheckTimer = null;
          }
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            try {
              mediaRecorder.stop();
            } catch (stopErr) {
              console.warn('mediaRecorder stop error:', stopErr);
            }
          }
        }
      }, 1000);

      showToast(`MV録画を開始しました（${targetDuration}秒間）`);
    } catch (err) {
      console.error('Recording error:', err);
      showToast('録画機能の起動に失敗しました');
    }
  }

  function handleRecordToggle() {
    triggerHaptic();
    const targetDuration = Math.round(trimDurationSeconds);
    if (isRecording) {
      if (healthCheckTimer) {
        clearTimeout(healthCheckTimer);
        healthCheckTimer = null;
      }
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        try {
          mediaRecorder.stop();
        } catch (reqErr) {}
      }
      resetRecordingUI(targetDuration);
      showToast('録画を完了しました');
    } else {
      startRecording();
    }
  }

  mainRecordBtn.addEventListener('click', handleRecordToggle);
  stageRecordBtn.addEventListener('click', handleRecordToggle);
  finalRecordBtn.addEventListener('click', handleRecordToggle);

  // Modal actions
  if (saveToPhotosBtn) {
    saveToPhotosBtn.addEventListener('click', async () => {
      triggerHaptic();
      if (!lastRecordedBlob) {
        showToast('録画データが見つかりません');
        return;
      }
      const mime = lastRecordedBlob.type || 'video/mp4';
      const fileToShare = lastRecordedFile || new File([lastRecordedBlob], lastRecordedFilename, { type: mime });

      // iOS Safari native share sheet: ONLY pass files array for maximum compatibility with Photos app
      const shareData = { files: [fileToShare] };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          showToast('共有メニューを開きました。「ビデオを保存」を押すと写真アプリに入ります');
          return;
        } catch (err) {
          if (err.name === 'AbortError') {
            return;
          }
          console.warn('navigator.share failed, falling back to download:', err);
        }
      }

      // Fallback
      triggerBlobDownload(lastRecordedBlob, lastRecordedFilename);
      showToast('ダウンロードを開始しました。Safariの ⬇️ または「ファイル」アプリをご確認ください');
    });
  }

  if (directDownloadBtn) {
    directDownloadBtn.addEventListener('click', () => {
      triggerHaptic();
      if (!lastRecordedBlob) {
        showToast('録画データが見つかりません');
        return;
      }
      triggerBlobDownload(lastRecordedBlob, lastRecordedFilename);
      showToast('ダウンロードを開始しました。Safariの ⬇️ または「ファイル」アプリをご確認ください');
    });
  }

  if (closeModalCrossBtn) closeModalCrossBtn.addEventListener('click', closeCompleteModal);
  if (closeModalBottomBtn) closeModalBottomBtn.addEventListener('click', closeCompleteModal);
  if (videoCompleteModal) {
    videoCompleteModal.addEventListener('click', (e) => {
      if (e.target === videoCompleteModal) {
        closeCompleteModal();
      }
    });
  }

  // Initialize Clean Standby State (No demo sample by default)
  currentSongConfig = null;
  if (controlSongTitle) controlSongTitle.textContent = '未選択（楽曲ファイルをアップロードしてください）';
  if (stageSongTitle) stageSongTitle.textContent = '楽曲未選択';
  if (controlTrimRangeBadge) controlTrimRangeBadge.textContent = '再生区間: 未設定';
  trimStartSeconds = 0;
  trimEndSeconds = 15;
  trimDurationSeconds = 15;
  updateTrimmerUI();

  // ==========================================
  // Main Animation Loop (60 FPS)
  // ==========================================
  function tick() {
    audioEngine.updateAnalysis(characterRenderer.lipsyncSens);
    const isStageVisible = viewStage && !viewStage.classList.contains('hidden');
    if (isStageVisible || isRecording) {
      characterRenderer.render(audioEngine);
    }

    if (audioEngine.isPlaying) {
      const cur = audioEngine.currentTime;
      const totalDur = Math.max(1, audioEngine.duration || 30);
      const curStr = formatTime(cur, false);

      if (audioEngine.playMode === 'full') {
        const fullPercent = Math.min(100, (cur / totalDur) * 100);
        const totalStr = formatTime(totalDur, false);
        const pairStr = `${curStr} / ${totalStr}`;
        if (controlSongTime && controlSongTime.textContent !== pairStr) {
          controlSongTime.textContent = pairStr;
        }
        if (stageSongTime && stageSongTime.textContent !== pairStr) {
          stageSongTime.textContent = pairStr;
        }
        if (stageProgressFill) {
          stageProgressFill.style.width = `${fullPercent}%`;
        }

        if (fullPlayerCurrentTime && fullPlayerCurrentTime.textContent !== curStr) {
          fullPlayerCurrentTime.textContent = curStr;
        }
        if (timelinePlayhead) {
          timelinePlayhead.style.left = `${fullPercent}%`;
        }
        if (fullSongSeekSlider && !fullSongSeekSlider.matches(':active') && document.activeElement !== fullSongSeekSlider) {
          const snapped = Math.round(cur * 2) / 2;
          if (Math.abs((parseFloat(fullSongSeekSlider.value) || 0) - snapped) >= 0.5) {
            fullSongSeekSlider.value = snapped;
          }
        }
      } else {
        const trimLen = audioEngine.getTrimDuration();
        const currentOffset = Math.max(0, cur - audioEngine.trimStart);
        const progressPercent = Math.min(100, (currentOffset / trimLen) * 100);
        const trimEndStr = formatTime(audioEngine.trimEnd, false);
        const pairStr = `${curStr} / ${trimEndStr}`;

        if (controlSongTime && controlSongTime.textContent !== pairStr) {
          controlSongTime.textContent = pairStr;
        }
        if (stageSongTime && stageSongTime.textContent !== pairStr) {
          stageSongTime.textContent = pairStr;
        }
        if (stageProgressFill) {
          stageProgressFill.style.width = `${progressPercent}%`;
        }

        if (fullPlayerCurrentTime && fullPlayerCurrentTime.textContent !== curStr) {
          fullPlayerCurrentTime.textContent = curStr;
        }
        if (timelinePlayhead) {
          const fullPercent = Math.min(100, (cur / totalDur) * 100);
          timelinePlayhead.style.left = `${fullPercent}%`;
        }
        if (fullSongSeekSlider && !fullSongSeekSlider.matches(':active') && document.activeElement !== fullSongSeekSlider) {
          const snapped = Math.round(cur * 2) / 2;
          if (Math.abs((parseFloat(fullSongSeekSlider.value) || 0) - snapped) >= 0.5) {
            fullSongSeekSlider.value = snapped;
          }
        }
      }

      if (isStageVisible && lyricsText) {
        if (currentSongConfig && currentSongConfig.lyrics) {
          let activeLyric = currentSongConfig.lyrics[0].text;
          for (const lyric of currentSongConfig.lyrics) {
            if (cur >= lyric.time) {
              activeLyric = lyric.text;
            }
          }
          if (lyricsText.textContent !== activeLyric) {
            lyricsText.textContent = activeLyric;
          }
        } else {
          const fallbackLyric = audioEngine.isPlaying ? '♪ 歌唱中...' : '音源を取り込むとリップシンクが連動します';
          if (lyricsText.textContent !== fallbackLyric) {
            lyricsText.textContent = fallbackLyric;
          }
        }
      }
    } else {
      if (fullPlayerStatusBadge && fullPlayerStatusBadge.classList.contains('playing')) {
        updateFullPlayerUI(false);
      }
    }

    if (isStageVisible && stageVisemeChar && stageVisemeChar.textContent !== audioEngine.currentChar) {
      stageVisemeChar.textContent = audioEngine.currentChar;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
});

```

### 5.3 `audio-engine.js`

```javascript
/**
 * GrooveSync MV - Web Audio & Beat/Viseme Analysis Engine
 * Supports user audio trimming (start point, end point, custom duration)
 * and rich vocal formant synthesis for official demo songs.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.destination = null;
    this.recDestination = null;
    this.sourceNode = null;
    this.micStream = null;
    this.micNode = null;

    this.isPlaying = false;
    this.isMicActive = false;
    this.currentTrackId = 'jpop';

    this.currentTime = 0;
    this.duration = 30;
    this.startTime = 0;
    this.pauseOffset = 0;

    // Trimming range (which part of song to use for MV)
    this.trimStart = 0;
    this.trimEnd = 30;

    // Demo song synthesizer state
    this.isDemoTrack = false; // set to true when official demo song is active
    this.synthInterval = null;
    this.synthNotesTimer = null;

    // Analysis data arrays
    this.fftSize = 512;
    this.freqData = null;
    this.timeData = null;

    // Visemes & groove states
    this.visemes = { A: 0, I: 0, U: 0, E: 0, O: 0 };
    this.currentChar = 'A';
    this.mouthOpen = 0; // 0 to 1
    this.mouthWidth = 0.5; // 0 to 1
    this.beatPulse = 0; // 0 to 1, decays
    this.grooveLevel = 0; // 0 to 1

    this.bpm = 132;
    this.audioBuffer = null; // user loaded song
    this.audioElement = null; // HTMLAudioElement fallback
    this.mediaElementSource = null;
    this.userAudioUrl = null;
    this.userAudioMode = null; // 'buffer' or 'element'

    this.playMode = 'trim'; // 'trim' or 'full'
    this.fullPlayOffset = 0;

    this.onEndedCallbacks = [];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.82;

      this.recDestination = this.ctx.createMediaStreamDestination();

      this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this.timeData = new Uint8Array(this.analyser.frequencyBinCount);

      // Connect analyser to both hardware speakers and recording stream
      this.analyser.connect(this.ctx.destination);
      this.analyser.connect(this.recDestination);
    }

    if (this.ctx.state === 'suspended') {
      try {
        const p = this.ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) {}
    }
  }

  // Load user audio file with bulletproof multi-layer fallback
  async loadUserFile(file) {
    this.init();
    this.stop();

    // Disable demo track when user uploads their own file
    this.isDemoTrack = false;

    // Clean up previous custom audio instances
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.src = '';
      } catch (e) {}
      this.audioElement = null;
    }
    if (this.userAudioUrl) {
      try { URL.revokeObjectURL(this.userAudioUrl); } catch (e) {}
      this.userAudioUrl = null;
    }
    this.audioBuffer = null;
    this.userAudioMode = null;
    this.rawUserFile = file || null;

    // Check if the user accidentally uploaded an image file
    if (file && file.type && file.type.startsWith('image/')) {
      return {
        success: false,
        error: '選択されたファイルは「画像（写真）」です。人物やアーティストの写真は、一番上の【STEP 1: 人物・写真を設定する】からアップロードしてください。'
      };
    }

    if (!file || file.size === 0) {
      return {
        success: false,
        error: 'ファイルサイズが0バイトです。iCloud上のファイルの場合は一度端末にダウンロードしてからお試しください。'
      };
    }

    // Helper: read ArrayBuffer safely (25s timeout for large M4A/WAV files on iOS)
    const getArrayBuffer = (timeoutMs = 25000) => {
      return new Promise(async (resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('ArrayBuffer timeout')), timeoutMs);
        try {
          if (typeof file.arrayBuffer === 'function') {
            const buf = await file.arrayBuffer();
            clearTimeout(timer);
            resolve(buf);
          } else {
            const reader = new FileReader();
            reader.onload = () => {
              clearTimeout(timer);
              resolve(reader.result);
            };
            reader.onerror = () => {
              clearTimeout(timer);
              reject(reader.error || new Error('FileReader failed'));
            };
            reader.readAsArrayBuffer(file);
          }
        } catch (err) {
          clearTimeout(timer);
          reject(err);
        }
      });
    };

    // Helper: decodeAudioData compatible with Promise & Callback (30s timeout)
    const decodeAudioSafe = (ctx, buffer, timeoutMs = 30000) => {
      return new Promise((resolve, reject) => {
        let finished = false;
        const timer = setTimeout(() => {
          if (!finished) {
            finished = true;
            reject(new Error('Audio decode timeout (30s)'));
          }
        }, timeoutMs);

        try {
          const res = ctx.decodeAudioData(
            buffer,
            (decoded) => {
              if (!finished) {
                finished = true;
                clearTimeout(timer);
                resolve(decoded);
              }
            },
            (err) => {
              if (!finished) {
                finished = true;
                clearTimeout(timer);
                reject(err || new Error('decodeAudioData callback failed'));
              }
            }
          );
          if (res && typeof res.then === 'function') {
            res.then((decoded) => {
              if (!finished) {
                finished = true;
                clearTimeout(timer);
                resolve(decoded);
              }
            }).catch((err) => {
              if (!finished) {
                finished = true;
                clearTimeout(timer);
                reject(err);
              }
            });
          }
        } catch (err) {
          if (!finished) {
            finished = true;
            clearTimeout(timer);
            reject(err);
          }
        }
      });
    };

    // LAYER 1: Fast direct AudioBuffer decoding
    try {
      const buffer = await getArrayBuffer(25000);
      const decoded = await decodeAudioSafe(this.ctx, buffer, 30000);
      this.audioBuffer = decoded;
      this.duration = decoded.duration;
      this.userAudioMode = 'buffer';

      this.trimStart = 0;
      this.trimEnd = Math.min(30, this.duration);
      this.bpm = this.estimateBpm(decoded);

      return {
        success: true,
        duration: this.duration,
        bpm: this.bpm,
        mode: 'buffer'
      };
    } catch (bufferErr) {
      console.warn('AudioBuffer direct decode failed, falling back to HTMLAudioElement:', bufferErr);
    }

    // LAYER 2: HTMLAudioElement fallback
    try {
      this.userAudioUrl = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audio.src = this.userAudioUrl;

      const dur = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
            resolve(audio.duration);
          } else {
            reject(new Error('HTMLAudioElement metadata timeout'));
          }
        }, 8000);

        audio.onloadedmetadata = () => {
          clearTimeout(timer);
          if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
            resolve(audio.duration);
          } else {
            resolve(30);
          }
        };
        audio.onerror = () => {
          clearTimeout(timer);
          reject(new Error('Audio element error'));
        };
      });

      this.audioElement = audio;
      this.duration = dur;
      this.userAudioMode = 'element';

      // Attempt background AudioBuffer decode so slicing/MP3/WAV export uses user's real song
      getArrayBuffer(35000).then(buf => decodeAudioSafe(this.ctx, buf, 45000)).then(decoded => {
        if (!this.isDemoTrack && !this.audioBuffer) {
          this.audioBuffer = decoded;
        }
      }).catch(() => {});

      try {
        if (!this.mediaElementSource) {
          this.mediaElementSource = this.ctx.createMediaElementSource(audio);
        }
        this.mediaElementSource.connect(this.analyser);
      } catch (nodeErr) {
        console.warn('createMediaElementSource warning:', nodeErr);
      }

      this.trimStart = 0;
      this.trimEnd = Math.min(30, this.duration);
      this.bpm = 124;

      return {
        success: true,
        duration: this.duration,
        bpm: this.bpm,
        mode: 'element'
      };
    } catch (elementErr) {
      console.error('All audio loading layers failed:', elementErr);
      return {
        success: false,
        error: '音声の読み込みに失敗しました。MP3またはM4A形式の音楽ファイルをお試しください。'
      };
    }
  }

  // Load official demo song (Shining Beat / J-POP Vocal)
  loadDemoTrack(trackId = 'jpop') {
    this.init();
    this.stop();

    this.isDemoTrack = true;
    this.rawUserFile = null;
    this.currentTrackId = trackId;
    this.duration = 30;
    this.trimStart = 0;
    this.trimEnd = 30;
    this.bpm = 132;
    this.userAudioMode = null;
    this.audioBuffer = null;
    if (this.audioElement) {
      try { this.audioElement.pause(); } catch (e) {}
      this.audioElement = null;
    }

    // Pre-synthesize demo buffer so cutting, slicing and downloading works immediately
    try {
      this.ensureAudioBuffer();
    } catch (e) {
      console.warn('Demo buffer pre-synthesis deferred:', e);
    }

    return {
      success: true,
      duration: 30,
      bpm: 132,
      isDemo: true
    };
  }

  // Ensure we have a valid AudioBuffer (synthesizes musical demo buffer if demo mode)
  ensureAudioBuffer() {
    if (this.audioBuffer) return this.audioBuffer;

    const ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    const sampleRate = ctx.sampleRate || 44100;
    const dur = Math.max(30, Math.ceil(this.duration || 32));
    const buffer = ctx.createBuffer(2, sampleRate * dur, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const bpm = this.bpm || 132;
    const beatSec = 60 / bpm;

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const beatProg = (t % beatSec) / beatSec;
      const kickEnv = Math.max(0, 1 - beatProg * 5);
      const kick = Math.sin(2 * Math.PI * (130 - beatProg * 95) * t) * kickEnv * 0.45;

      const barProg = (t % (beatSec * 4)) / beatSec;
      let snare = 0;
      if ((barProg >= 1 && barProg < 2) || (barProg >= 3 && barProg < 4)) {
        const snareProg = barProg % 1;
        const snareEnv = Math.max(0, 1 - snareProg * 6);
        const noise = (Math.random() * 2 - 1) * 0.28;
        const tone = Math.sin(2 * Math.PI * 180 * t) * 0.2;
        snare = (noise + tone) * snareEnv;
      }

      const chordIndex = Math.floor(t / (beatSec * 4)) % 4;
      const chords = [
        [261.63, 329.63, 392.00],
        [220.00, 261.63, 329.63],
        [174.61, 220.00, 261.63],
        [196.00, 246.94, 293.66]
      ];
      let synth = 0;
      chords[chordIndex].forEach(f => {
        synth += Math.sin(2 * Math.PI * f * t) * 0.08;
      });

      const vocalMelody = [523.25, 587.33, 659.25, 587.33, 523.25, 440.00, 493.88, 523.25];
      const vocalNote = vocalMelody[Math.floor(t / beatSec) % vocalMelody.length];
      const vocal = Math.sin(2 * Math.PI * vocalNote * t) * 0.12 * (1 + Math.sin(t * 12) * 0.15);

      left[i] = Math.max(-0.95, Math.min(0.95, kick + snare * 0.8 + synth + vocal * 0.9));
      right[i] = Math.max(-0.95, Math.min(0.95, kick + snare * 0.8 + synth * 0.9 + vocal * 1.1));
    }

    this.audioBuffer = buffer;
    return buffer;
  }

  // Simple BPM heuristic estimator
  estimateBpm(buffer) {
    try {
      const channelData = buffer.getChannelData(0);
      const sampleRate = buffer.sampleRate;
      const step = Math.floor(sampleRate / 100);
      const peaks = [];

      for (let i = 0; i < Math.min(channelData.length, sampleRate * 30); i += step) {
        let max = 0;
        for (let j = 0; j < step; j++) {
          const val = Math.abs(channelData[i + j] || 0);
          if (val > max) max = val;
        }
        if (max > 0.65) {
          peaks.push(i / sampleRate);
        }
      }

      if (peaks.length < 8) return 126;

      const intervals = [];
      for (let i = 1; i < peaks.length; i++) {
        const diff = peaks[i] - peaks[i - 1];
        if (diff > 0.35 && diff < 0.85) {
          intervals.push(diff);
        }
      }

      if (intervals.length === 0) return 128;
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      let estBpm = Math.round(60 / avgInterval);
      while (estBpm < 85) estBpm *= 2;
      while (estBpm > 175) estBpm = Math.round(estBpm / 2);
      return estBpm;
    } catch (e) {
      return 128;
    }
  }

  // Set trim range
  setTrimRange(startSeconds, endSeconds) {
    this.trimStart = Math.max(0, startSeconds);
    this.trimEnd = Math.max(this.trimStart + 0.5, Math.min(endSeconds, this.duration || 30));
  }

  getTrimDuration() {
    return Math.max(0.5, this.trimEnd - this.trimStart);
  }

  hasAudioLoaded() {
    return !!(this.audioBuffer || (this.audioElement && this.userAudioUrl) || this.isDemoTrack);
  }

  // Play specified trim range
  playTrim(startAt) {
    if (!this.hasAudioLoaded()) return false;
    this.init();
    if (this.isPlaying) this.pause();

    this.isPlaying = true;
    this.playMode = 'trim';

    const trimLen = this.getTrimDuration();
    const offset = (startAt !== undefined) ? (startAt % trimLen) : (this.pauseOffset % trimLen);
    this.pauseOffset = offset;
    const startPoint = this.trimStart + offset;
    const playLength = Math.max(0.1, this.trimEnd - startPoint);

    this.startTime = this.ctx.currentTime - offset;
    this.currentTime = startPoint;

    // If demo track: play rich synthesized vocal song
    if (this.isDemoTrack) {
      this.startSynthTrack();
      return true;
    }

    if (this.userAudioMode === 'element' && this.audioElement) {
      const el = this.audioElement;
      try { el.currentTime = startPoint; } catch (e) {}

      const playP = el.play();
      if (playP && typeof playP.then === 'function') {
        playP.then(() => {
          if (Math.abs(el.currentTime - startPoint) > 0.3) {
            try { el.currentTime = startPoint; } catch (e) {}
          }
        }).catch(e => console.warn('Audio play error:', e));
      }

      el.ontimeupdate = () => {
        if (this.isPlaying && this.playMode === 'trim') {
          if (el.currentTime < this.trimStart - 0.5) {
            try { el.currentTime = this.trimStart; } catch (e) {}
            return;
          }
          if (el.currentTime >= this.trimEnd - 0.1) {
            try { el.currentTime = this.trimStart; } catch (e) {}
          }
        }
      };
    } else if (this.audioBuffer) {
      this.sourceNode = this.ctx.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;
      this.sourceNode.connect(this.analyser);
      this.sourceNode.onended = () => {
        if (this.isPlaying && this.playMode === 'trim' && this.currentTime >= this.trimEnd - 0.25) {
          this.pause();
          this.pauseOffset = 0;
          this.playTrim(0);
        }
      };
      this.sourceNode.start(0, startPoint, playLength);
    }
    return true;
  }

  // Play full song from given second to end
  playFull(startSecond = 0) {
    if (!this.hasAudioLoaded()) return false;
    this.init();
    if (this.isPlaying) this.pause();

    this.isPlaying = true;
    this.playMode = 'full';
    this.fullPlayOffset = Math.max(0, Math.min(startSecond, this.duration - 0.1));
    this.startTime = this.ctx.currentTime;
    this.currentTime = this.fullPlayOffset;

    const playLength = Math.max(0.1, this.duration - this.fullPlayOffset);

    if (this.isDemoTrack) {
      this.startSynthTrack();
      return true;
    }

    if (this.userAudioMode === 'element' && this.audioElement) {
      try { this.audioElement.currentTime = this.fullPlayOffset; } catch (e) {}
      this.audioElement.play().catch(e => console.warn('Audio play error:', e));
      this.audioElement.ontimeupdate = () => {
        if (this.isPlaying && this.playMode === 'full') {
          if (this.audioElement.currentTime >= this.duration - 0.1) {
            this.stop();
          }
        }
      };
    } else if (this.audioBuffer) {
      this.sourceNode = this.ctx.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;
      this.sourceNode.connect(this.analyser);
      this.sourceNode.onended = () => {
        if (this.isPlaying && this.playMode === 'full') {
          if (this.currentTime >= this.duration - 0.25) {
            this.stop();
          }
        }
      };
      this.sourceNode.start(0, this.fullPlayOffset, playLength);
    }
    return true;
  }

  play() {
    if (!this.hasAudioLoaded()) return false;
    if (this.playMode === 'full') {
      return this.playFull(this.fullPlayOffset);
    } else {
      return this.playTrim();
    }
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this.isDemoTrack) {
      this.stopSynthTrack();
      return;
    }

    if (this.playMode === 'full') {
      if (this.userAudioMode === 'element' && this.audioElement) {
        this.fullPlayOffset = this.audioElement.currentTime;
        this.audioElement.pause();
      } else if (this.audioBuffer) {
        const elapsed = this.ctx.currentTime - this.startTime;
        this.fullPlayOffset = Math.min(this.duration, this.fullPlayOffset + elapsed);
      }
    } else {
      const trimLen = this.getTrimDuration();
      if (this.userAudioMode === 'element' && this.audioElement) {
        this.pauseOffset = Math.max(0, this.audioElement.currentTime - this.trimStart) % trimLen;
        this.audioElement.pause();
      } else {
        this.pauseOffset = (this.ctx.currentTime - this.startTime) % trimLen;
      }
    }

    if (this.sourceNode) {
      try { this.sourceNode.stop(); } catch (e) {}
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.stopSynthTrack();
  }

  stop() {
    this.pause();
    this.pauseOffset = 0;
    this.fullPlayOffset = 0;
    this.currentTime = (this.playMode === 'trim') ? this.trimStart : 0;
    if (this.userAudioMode === 'element' && this.audioElement) {
      try { this.audioElement.currentTime = this.currentTime; } catch (e) {}
    }
  }

  seekFull(targetSeconds) {
    const sec = Math.max(0, Math.min(targetSeconds, this.duration));
    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.pause();
    this.fullPlayOffset = sec;
    this.currentTime = sec;
    if (this.userAudioMode === 'element' && this.audioElement) {
      try { this.audioElement.currentTime = sec; } catch (e) {}
    }
    if (wasPlaying) {
      this.playFull(sec);
    }
  }

  seek(ratio) {
    if (this.playMode === 'full') {
      this.seekFull(ratio * this.duration);
    } else {
      const trimLen = this.getTrimDuration();
      const target = ratio * trimLen;
      const wasPlaying = this.isPlaying;
      if (wasPlaying) this.pause();
      this.pauseOffset = target;
      this.currentTime = this.trimStart + target;
      if (this.userAudioMode === 'element' && this.audioElement) {
        try { this.audioElement.currentTime = this.currentTime; } catch (e) {}
      }
      if (wasPlaying) this.playTrim(target);
    }
  }

  toggleMic() {
    this.init();
    if (this.isMicActive) {
      if (this.micStream) {
        this.micStream.getTracks().forEach(t => t.stop());
      }
      if (this.micNode) {
        this.micNode.disconnect();
        this.micNode = null;
      }
      this.isMicActive = false;
      return false;
    } else {
      return navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          this.micStream = stream;
          this.micNode = this.ctx.createMediaStreamSource(stream);
          this.micNode.connect(this.analyser);
          this.isMicActive = true;
          return true;
        })
        .catch(err => {
          console.error("Mic access denied or error:", err);
          return false;
        });
    }
  }

  // Real-time analysis for every frame
  updateAnalysis(sensitivity = 1.0) {
    if (!this.analyser) return;

    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.timeData);

    if (this.isPlaying) {
      if (this.isDemoTrack) {
        const trimLen = this.getTrimDuration();
        const elapsed = (this.ctx.currentTime - this.startTime) % trimLen;
        this.currentTime = this.trimStart + elapsed;
      } else if (this.playMode === 'full') {
        if (this.userAudioMode === 'element' && this.audioElement) {
          this.currentTime = this.audioElement.currentTime;
        } else if (this.audioBuffer) {
          const elapsed = this.ctx.currentTime - this.startTime;
          this.currentTime = Math.min(this.duration, this.fullPlayOffset + elapsed);
        } else {
          this.currentTime = (this.ctx.currentTime - this.startTime + this.fullPlayOffset) % this.duration;
        }
      } else {
        if (this.userAudioMode === 'element' && this.audioElement) {
          this.currentTime = this.audioElement.currentTime;
        } else if (this.audioBuffer) {
          const trimLen = this.getTrimDuration();
          const elapsed = (this.ctx.currentTime - this.startTime) % trimLen;
          this.currentTime = this.trimStart + elapsed;
        } else {
          const trimLen = this.getTrimDuration();
          const elapsed = (this.ctx.currentTime - this.startTime) % trimLen;
          this.currentTime = this.trimStart + elapsed;
        }
      }
    }

    // Frequency spectrum bands
    const binCount = this.analyser.frequencyBinCount;

    // Sub-bass (kick & beat): ~20Hz - 150Hz
    let bassSum = 0;
    const bassEnd = Math.floor(binCount * 0.08);
    for (let i = 1; i < bassEnd; i++) bassSum += this.freqData[i];
    const bassAvg = (bassSum / (bassEnd - 1)) / 255;

    // Mid low (body & rhythm): ~150Hz - 600Hz
    let midLowSum = 0;
    const midLowEnd = Math.floor(binCount * 0.22);
    for (let i = bassEnd; i < midLowEnd; i++) midLowSum += this.freqData[i];
    const midLowAvg = (midLowSum / (midLowEnd - bassEnd)) / 255;

    // Vocal vowel Formant 1: ~600Hz - 1600Hz
    let form1Sum = 0;
    const form1End = Math.floor(binCount * 0.45);
    for (let i = midLowEnd; i < form1End; i++) form1Sum += this.freqData[i];
    const form1Avg = (form1Sum / (form1End - midLowEnd)) / 255;

    // Vocal vowel Formant 2: ~1600Hz - 4000Hz
    let form2Sum = 0;
    const form2End = Math.floor(binCount * 0.75);
    for (let i = form1End; i < form2End; i++) form2Sum += this.freqData[i];
    const form2Avg = (form2Sum / (form2End - form1End)) / 255;

    // High presence: ~4000Hz+
    let highSum = 0;
    for (let i = form2End; i < binCount; i++) highSum += this.freqData[i];
    const highAvg = (highSum / (binCount - form2End)) / 255;

    // Total vocal loudness
    const vocalLoudness = (form1Avg * 0.48 + form2Avg * 0.45 + highAvg * 0.07) * sensitivity;

    // Beat pulse detection (kick thump)
    if (bassAvg > 0.52 && bassAvg > this.beatPulse) {
      this.beatPulse = Math.min(1.0, bassAvg * 1.35);
    } else {
      this.beatPulse *= 0.88; // natural decay
    }

    // Groove level (smooth body sway)
    const targetGroove = (midLowAvg * 0.6 + bassAvg * 0.4);
    this.grooveLevel += (targetGroove - this.grooveLevel) * 0.15;

    // Viseme calculation (A, I, U, E, O)
    const rawA = Math.max(0, form1Avg * 1.3 + form2Avg * 0.5 - 0.15);
    const rawI = Math.max(0, form2Avg * 1.7 - form1Avg * 0.5);
    const rawU = Math.max(0, midLowAvg * 1.25 - form2Avg * 0.75);
    const rawE = Math.max(0, form2Avg * 1.15 + form1Avg * 0.5 - 0.12);
    const rawO = Math.max(0, form1Avg * 1.45 - form2Avg * 0.35);

    const sum = rawA + rawI + rawU + rawE + rawO + 0.001;
    this.visemes.A = (rawA / sum) * vocalLoudness;
    this.visemes.I = (rawI / sum) * vocalLoudness;
    this.visemes.U = (rawU / sum) * vocalLoudness;
    this.visemes.E = (rawE / sum) * vocalLoudness;
    this.visemes.O = (rawO / sum) * vocalLoudness;

    let maxVal = -1;
    let dominant = 'A';
    for (const [char, val] of Object.entries(this.visemes)) {
      if (val > maxVal) {
        maxVal = val;
        dominant = char;
      }
    }
    if (vocalLoudness > 0.06) {
      this.currentChar = dominant;
    }

    const targetOpen = Math.min(1.0, Math.max(0, (vocalLoudness - 0.04) * 1.9));
    this.mouthOpen += (targetOpen - this.mouthOpen) * 0.38;

    let targetWidth = 0.5;
    if (dominant === 'I' || dominant === 'E') targetWidth = 0.85;
    else if (dominant === 'U' || dominant === 'O') targetWidth = 0.35;
    else targetWidth = 0.6;
    this.mouthWidth += (targetWidth - this.mouthWidth) * 0.25;
  }

  // ==========================================
  // Demo Song Synthesizer with Vocal Formants
  // ==========================================
  startSynthTrack() {
    this.stopSynthTrack();

    const bpm = this.bpm || 132;
    const beatInterval = 60 / bpm;
    const sixteenth = beatInterval / 4;

    this.startTime = this.ctx.currentTime - (this.pauseOffset % this.getTrimDuration());

    let step = Math.floor((this.pauseOffset % this.getTrimDuration()) / sixteenth);

    const scheduleNext = () => {
      if (!this.isPlaying) return;

      const time = this.ctx.currentTime + 0.04;
      const currentStep = step % 64;

      this.triggerStepAudio(this.currentTrackId, currentStep, time);

      step++;
      this.synthInterval = setTimeout(scheduleNext, sixteenth * 1000 * 0.95);
    };

    scheduleNext();
  }

  stopSynthTrack() {
    if (this.synthInterval) {
      clearTimeout(this.synthInterval);
      this.synthInterval = null;
    }
  }

  // Synthesize instruments and organic vocal singing voice
  triggerStepAudio(genre, step, time) {
    if (!this.ctx) return;

    const isKick = (genre === 'lofi') ? (step % 16 === 0 || step % 16 === 10) : (step % 8 === 0);
    const isSnare = (genre === 'lofi') ? (step % 16 === 8) : (step % 16 === 8 || (genre === 'rock' && (step % 8 === 4)));
    const isHiHat = (step % 2 === 0);

    // 1. Kick Drum (Deep punch)
    if (isKick) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(36, time + 0.12);
      gain.gain.setValueAtTime(0.75, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.20);
      osc.connect(gain);
      gain.connect(this.analyser);
      osc.start(time);
      osc.stop(time + 0.22);
    }

    // 2. Snare Drum
    if (isSnare) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, time);
      gain.gain.setValueAtTime(0.40, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
      osc.connect(gain);
      gain.connect(this.analyser);
      osc.start(time);
      osc.stop(time + 0.18);
    }

    // 3. Hi-Hat
    if (isHiHat) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'highpass';
      osc.frequency.setValueAtTime(8000, time);
      gain.gain.setValueAtTime(0.07, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
      osc.connect(gain);
      gain.connect(this.analyser);
      osc.start(time);
      osc.stop(time + 0.05);
    }

    // 4. Accompaniment Chords (Piano / Guitar / Synth)
    const chordScale = [261.63, 329.63, 392.00, 523.25, 440.00];
    if (step % 4 === 0) {
      const chordOsc = this.ctx.createOscillator();
      const chordGain = this.ctx.createGain();
      chordOsc.type = 'sawtooth';
      const chordNote = chordScale[(Math.floor(step / 16)) % chordScale.length];
      chordOsc.frequency.setValueAtTime(chordNote, time);

      // Lowpass filter for smooth warm backing chord
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, time);

      chordGain.gain.setValueAtTime(0.18, time);
      chordGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      chordOsc.connect(filter);
      filter.connect(chordGain);
      chordGain.connect(this.analyser);
      chordOsc.start(time);
      chordOsc.stop(time + 0.24);
    }

    // 5. LEAD VOCAL SINGING VOICE (with realistic Japanese vowel formants!)
    // Generates genuine singing vocal harmonics that the analyser decodes into realistic visemes
    if (step % 2 === 0 && (step % 8 !== 7)) {
      const melodyNotes = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 659.25, 783.99];
      const melodyIdx = Math.floor(step / 2) % melodyNotes.length;
      const note = melodyNotes[melodyIdx];

      // Japanese vowel formant frequencies (F1 / F2 in Hz)
      const vowelFormants = [
        { char: 'A', f1: 820, f2: 1300 }, // あ
        { char: 'I', f1: 310, f2: 2350 }, // い
        { char: 'U', f1: 340, f2: 860 },  // う
        { char: 'E', f1: 540, f2: 1980 }, // え
        { char: 'O', f1: 510, f2: 960 }   // お
      ];
      const vowel = vowelFormants[melodyIdx % vowelFormants.length];

      // Sawtooth vocal cord oscillator (rich in vocal harmonics)
      const vocOsc = this.ctx.createOscillator();
      vocOsc.type = 'sawtooth';
      vocOsc.frequency.setValueAtTime(note, time);

      // Formant Filter 1 (F1: Throat cavity)
      const f1Filter = this.ctx.createBiquadFilter();
      f1Filter.type = 'bandpass';
      f1Filter.frequency.setValueAtTime(vowel.f1, time);
      f1Filter.Q.setValueAtTime(4.2, time);

      // Formant Filter 2 (F2: Oral cavity / vowel definition)
      const f2Filter = this.ctx.createBiquadFilter();
      f2Filter.type = 'bandpass';
      f2Filter.frequency.setValueAtTime(vowel.f2, time);
      f2Filter.Q.setValueAtTime(5.5, time);

      const vocGain = this.ctx.createGain();
      vocGain.gain.setValueAtTime(0.36, time);
      vocGain.gain.exponentialRampToValueAtTime(0.015, time + 0.16);

      // Connect vocal chain: Osc -> Parallel Filters -> Gain -> Analyser
      vocOsc.connect(f1Filter);
      vocOsc.connect(f2Filter);
      f1Filter.connect(vocGain);
      f2Filter.connect(vocGain);
      vocGain.connect(this.analyser);

      vocOsc.start(time);
      vocOsc.stop(time + 0.18);
    }
  }
}

window.AudioEngine = AudioEngine;

```

### 5.4 `character-renderer.js`

```javascript
/**
 * Next-Gen MV Studio - High-End Stage Visualizer & Beat-Sync Performance Renderer (v11)
 * Features dynamic concert stage lighting, beat-synchronized audio visualization,
 * 3D-depth perspective floor, floating laser beams, and flawless portrait presentation
 * without any unnatural face distortion or glitched cuts.
 */

class CharacterRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Rendering parameters
    this.aspectRatio = '9:16';
    this.motionPreset = (typeof GROOVE_PRESETS !== 'undefined' && GROOVE_PRESETS.motions) ? GROOVE_PRESETS.motions.guitar : {};
    this.stageTheme = (typeof GROOVE_PRESETS !== 'undefined' && GROOVE_PRESETS.stages) ? GROOVE_PRESETS.stages.livehouse : {
      name: 'Live House',
      bgGradient: ['#0b0817', '#1a0f35', '#06040d'],
      lasers: ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b']
    };
    this.cameraMode = 'dynamic';

    // Sliders & sensitivities
    this.lipsyncSens = 0.85;
    this.grooveStrength = 0.70;
    this.expressionLevel = 0.80;
    this.headbobStrength = 0.75;

    // Visual effects toggles
    this.showLasers = true;
    this.showParticles = true;
    this.showVisualizer = true;

    // Custom user/sample photo avatar
    this.customAvatarImg = null;
    this.aiVideoElement = null; // When AI video is loaded/generated
    this.aiMotionActive = false; // Step 1 non-lipsync AI video motion mode
    this.aiModelBadge = '';
    this.aiPromptStyle = 'sway';

    // Simulation states
    this.time = 0;
    this.particles = [];
    this.lasers = [];
    this.cameraShake = { zoom: 1, tilt: 0 };
    this.frequencyBars = new Float32Array(32);

    // Offscreen mask canvas for seamless cinematic edge blending
    this.maskCanvas = document.createElement('canvas');
    this.maskCtx = this.maskCanvas.getContext('2d');

    this.initStage();
  }

  initStage() {
    this.particles = [];
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * (this.canvas.width || 720),
        y: Math.random() * (this.canvas.height || 1280),
        r: Math.random() * 2.8 + 1.2,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 1.2 - 0.4,
        alpha: Math.random() * 0.7 + 0.3,
        color: Math.random() > 0.5 ? '#a855f7' : (Math.random() > 0.5 ? '#06b6d4' : '#ec4899')
      });
    }

    this.lasers = [];
    for (let i = 0; i < 7; i++) {
      this.lasers.push({
        angle: (i / 6) * Math.PI - Math.PI / 2,
        speed: (Math.random() * 0.02 + 0.012) * (i % 2 === 0 ? 1 : -1),
        width: 14 + Math.random() * 14
      });
    }
  }

  setMotion(id) {
    if (typeof GROOVE_PRESETS !== 'undefined' && GROOVE_PRESETS.motions && GROOVE_PRESETS.motions[id]) {
      this.motionPreset = GROOVE_PRESETS.motions[id];
    }
  }

  setCustomAvatar(imageElement) {
    this.customAvatarImg = imageElement;
  }

  setAiVideo(videoElement) {
    this.aiVideoElement = videoElement;
  }

  setStage(id) {
    if (typeof GROOVE_PRESETS !== 'undefined' && GROOVE_PRESETS.stages && GROOVE_PRESETS.stages[id]) {
      this.stageTheme = GROOVE_PRESETS.stages[id];
    }
  }

  // Main Render Loop
  render(audioEngine) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.time += 0.016;

    // Retrieve audio analysis data
    const isPlaying = audioEngine ? audioEngine.isPlaying : false;
    let beatPulse = 0;
    let bpm = 128;

    if (audioEngine) {
      beatPulse = audioEngine.beatPulse || 0;
      bpm = audioEngine.bpm || 128;

      // Update frequency bars for visualizer
      if (audioEngine.freqData) {
        const binCount = audioEngine.freqData.length;
        const step = Math.floor(binCount / 32);
        for (let i = 0; i < 32; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += audioEngine.freqData[i * step + j] || 0;
          }
          const val = sum / (step * 255);
          this.frequencyBars[i] += (val - this.frequencyBars[i]) * 0.35;
        }
      }
    }

    // Dynamic camera punch on kick beats
    const targetZoom = 1.0 + beatPulse * 0.04;
    this.cameraShake.zoom += (targetZoom - this.cameraShake.zoom) * 0.2;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.cameraShake.zoom, this.cameraShake.zoom);
    ctx.translate(-w / 2, -h / 2);

    // 1. Stage Background
    this.drawStageBackground(w, h, beatPulse);

    // 2. Perspective Floor & Neon Grid
    this.drawStageFloor(w, h, beatPulse);

    // 3. Stage Lasers
    if (this.showLasers) {
      this.drawStageLasers(w, h, beatPulse);
    }

    // 4. Circular Audio Visualizer Ring
    if (this.showVisualizer) {
      this.drawAudioSpectrumRing(w, h, beatPulse);
    }

    // 5. Main Center Artist Display (Clean & Flawless)
    if (this.aiVideoElement && !this.aiVideoElement.paused && this.aiVideoElement.readyState >= 2) {
      this.drawAiVideoPerformance(w, h, beatPulse);
    } else if (this.customAvatarImg) {
      this.drawArtistPortrait(w, h, { isPlaying, beatPulse, bpm });
    } else {
      this.drawEmptyStageState(w, h, beatPulse);
    }

    // 6. Floating Ambient Particles
    if (this.showParticles) {
      this.drawParticles(w, h, beatPulse);
    }

    // 7. Equalizer Bars at bottom
    this.drawBottomEqualizer(w, h, beatPulse);

    // 8. Stage Atmosphere & Vignette
    this.drawVignette(w, h, beatPulse);

    ctx.restore();
  }

  // Background Gradient & Glow
  drawStageBackground(w, h, beatPulse) {
    const ctx = this.ctx;
    const theme = this.stageTheme || {};
    const bg = theme.bgGradient || ['#0b0817', '#1a0f35', '#06040d'];
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, bg[0]);
    grad.addColorStop(0.5, bg[1] || bg[0]);
    grad.addColorStop(1, bg[2] || bg[0]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Center Stage Spotlight
    const spotX = w / 2;
    const spotY = h * 0.40;
    const spotRad = (w * 0.58) + beatPulse * 45;
    const spotGrad = ctx.createRadialGradient(spotX, spotY, 20, spotX, spotY, spotRad);
    spotGrad.addColorStop(0, `rgba(168, 85, 247, ${0.35 + beatPulse * 0.25})`);
    spotGrad.addColorStop(0.5, `rgba(236, 72, 153, ${0.16 + beatPulse * 0.15})`);
    spotGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.arc(spotX, spotY, spotRad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Perspective Concert Floor
  drawStageFloor(w, h, beatPulse) {
    const ctx = this.ctx;
    const floorY = h * 0.72;
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
    floorGrad.addColorStop(0, 'rgba(15, 23, 42, 0.96)');
    floorGrad.addColorStop(1, 'rgba(2, 6, 23, 0.99)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, w, h - floorY);

    // Neon Horizon Beam
    ctx.save();
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 12 + beatPulse * 15;
    ctx.strokeStyle = `rgba(192, 132, 252, ${0.6 + beatPulse * 0.4})`;
    ctx.lineWidth = 3 + beatPulse * 3;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(w, floorY);
    ctx.stroke();
    ctx.restore();

    // Perspective floor lines
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 + beatPulse * 0.05})`;
    ctx.lineWidth = 1.5;
    for (let x = -w * 0.3; x <= w * 1.3; x += w * 0.14) {
      ctx.beginPath();
      ctx.moveTo(w / 2, floorY - 50);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }

  // Laser Beams
  drawStageLasers(w, h, beatPulse) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const originY = -40;
    const lasersColors = (this.stageTheme && this.stageTheme.lasers) || ['#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b'];
    this.lasers.forEach((laser, idx) => {
      laser.angle += laser.speed;
      if (Math.abs(laser.angle) > Math.PI * 0.45) laser.speed *= -1;

      const originX = w * (0.12 + (idx / 6) * 0.76);
      const targetX = originX + Math.sin(laser.angle + Math.sin(this.time * 0.5)) * (w * 0.85);
      const targetY = h * 0.82;

      const laserColor = lasersColors[idx % lasersColors.length];
      const alpha = (0.25 + beatPulse * 0.5);

      const lGrad = ctx.createLinearGradient(originX, originY, targetX, targetY);
      lGrad.addColorStop(0, `rgba(255,255,255,${alpha * 0.95})`);
      lGrad.addColorStop(0.3, laserColor);
      lGrad.addColorStop(1, 'transparent');

      ctx.strokeStyle = lGrad;
      ctx.lineWidth = laser.width + beatPulse * 8;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
    });

    ctx.restore();
  }

  // Audio Spectrum Ring (Hologram Visualizer behind artist)
  drawAudioSpectrumRing(w, h, beatPulse) {
    const ctx = this.ctx;
    const cx = w / 2;
    const cy = h * 0.42;
    const baseRad = w * 0.36;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const barCount = this.frequencyBars.length;
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2 + this.time * 0.2;
      const mag = this.frequencyBars[i] || 0;
      const barLen = 10 + mag * 65 + beatPulse * 20;

      const x1 = cx + Math.cos(angle) * (baseRad);
      const y1 = cy + Math.sin(angle) * (baseRad);
      const x2 = cx + Math.cos(angle) * (baseRad + barLen);
      const y2 = cy + Math.sin(angle) * (baseRad + barLen);

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
      grad.addColorStop(1, `rgba(6, 182, 212, ${0.5 + mag * 0.5})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // Flawless High-Res Artist Portrait (NO cutting or face deformation)
  drawArtistPortrait(w, h, params) {
    const ctx = this.ctx;
    const img = this.customAvatarImg;
    if (!img) return;

    const isPlaying = params.isPlaying;
    const bpm = params.bpm || 128;
    const beatPulse = params.beatPulse || 0;

    // Organic singer motion & breathing
    let bodySwayX = 0;
    let smoothNodY = 0;
    let breathScale = 1.0;
    let bodyTilt = 0;

    if (isPlaying || this.aiMotionActive) {
      const swayRate = (bpm / 60) * Math.PI * 0.75;
      if (this.aiMotionActive) {
        // Cinematic AI Video style motion (smooth 3D camera pan, parallax zoom, natural body groove)
        if (this.aiPromptStyle === 'zoom') {
          bodySwayX = Math.sin(this.time * 0.8) * 10.0;
          smoothNodY = Math.cos(this.time * 0.6) * 6.0;
          breathScale = 1.04 + Math.sin(this.time * 0.7) * 0.045 + (beatPulse * 0.02);
          bodyTilt = Math.sin(this.time * 0.5) * 0.018;
        } else if (this.aiPromptStyle === 'dynamic') {
          bodySwayX = Math.sin(this.time * swayRate) * 14.0;
          smoothNodY = Math.sin(this.time * swayRate * 2) * 7.0 + (beatPulse * 6.0);
          breathScale = 1.02 + Math.sin(this.time * 1.8) * 0.025 + (beatPulse * 0.03);
          bodyTilt = bodySwayX / 380;
        } else {
          bodySwayX = Math.sin(this.time * swayRate * 0.85) * 9.5;
          smoothNodY = Math.sin(this.time * swayRate * 1.7) * 5.0 + (beatPulse * 4.5);
          breathScale = 1.02 + Math.sin(this.time * 1.2) * 0.022 + (beatPulse * 0.022);
          bodyTilt = bodySwayX / 450;
        }
      } else {
        bodySwayX = Math.sin(this.time * swayRate) * 6.0;
        smoothNodY = Math.sin(this.time * swayRate * 2) * 3.5 + (beatPulse * 4.0);
        breathScale = 1.0 + Math.sin(this.time * 1.5) * 0.01 + (beatPulse * 0.02);
        bodyTilt = bodySwayX / 550;
      }
    } else {
      breathScale = 1.0 + Math.sin(this.time * 0.9) * 0.006;
    }

    // Ambient glow behind artist
    const imgW = img.width || 512;
    const imgH = img.height || 512;
    ctx.save();
    ctx.globalAlpha = 0.28 + beatPulse * 0.16;
    ctx.filter = 'blur(40px)';
    const bgScale = Math.max(w / imgW, h / imgH) * 1.15;
    const bgW = imgW * bgScale;
    const bgH = imgH * bgScale;
    ctx.drawImage(img, (w - bgW) / 2, (h - bgH) / 2, bgW, bgH);
    ctx.restore();

    // Main Artist Presentation Card / Hologram
    const maxPortraitW = w * 0.84;
    const maxPortraitH = h * 0.68;
    const aspect = imgW / imgH;

    let renderW, renderH;
    if (aspect > maxPortraitW / maxPortraitH) {
      renderW = maxPortraitW;
      renderH = maxPortraitW / aspect;
    } else {
      renderH = maxPortraitH;
      renderW = maxPortraitH * aspect;
    }

    const centerX = w / 2;
    const centerY = h * 0.44;

    ctx.save();
    ctx.translate(centerX + bodySwayX, centerY + smoothNodY);
    ctx.rotate(bodyTilt);
    ctx.scale(breathScale, breathScale);

    const drawX = -renderW / 2;
    const drawY = -renderH / 2;

    // Render photo with seamless soft edge mask (dissolves cleanly into dark stage)
    this.renderFeatheredPortrait(img, drawX, drawY, renderW, renderH);

    // Dynamic Beat Aura Glow Frame
    ctx.save();
    ctx.strokeStyle = this.aiMotionActive
      ? `rgba(56, 189, 248, ${0.55 + beatPulse * 0.45})`
      : `rgba(168, 85, 247, ${0.4 + beatPulse * 0.5})`;
    ctx.lineWidth = 2 + beatPulse * 3;
    ctx.shadowColor = this.aiMotionActive ? '#06b6d4' : '#ec4899';
    ctx.shadowBlur = 15 + beatPulse * 20;

    // Rounded subtle border around the portrait area
    const rad = 24;
    ctx.beginPath();
    ctx.roundRect(drawX + 8, drawY + 8, renderW - 16, renderH - 16, rad);
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    // If AI video mode is active, display sleek badge at top-right of stage
    if (this.aiMotionActive && this.aiModelBadge) {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 1.5;
      const badgeW = 310;
      const badgeH = 38;
      const bx = (w - badgeW) / 2;
      const by = h * 0.10;
      ctx.beginPath();
      ctx.roundRect(bx, by, badgeW, badgeH, 19);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 15px "Noto Sans JP", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🎬 AI動画モード: ${this.aiModelBadge}`, w / 2, by + 24);
      ctx.restore();
    }
  }

  // Draw AI Lip-Sync Generated Video
  drawAiVideoPerformance(w, h, beatPulse) {
    const ctx = this.ctx;
    const vid = this.aiVideoElement;
    if (!vid) return;

    const vidW = vid.videoWidth || 720;
    const vidH = vid.videoHeight || 1280;
    const aspect = vidW / vidH;

    const maxW = w * 0.90;
    const maxH = h * 0.74;

    let renderW, renderH;
    if (aspect > maxW / maxH) {
      renderW = maxW;
      renderH = maxW / aspect;
    } else {
      renderH = maxH;
      renderW = maxH * aspect;
    }

    const cx = w / 2;
    const cy = h * 0.44;

    ctx.save();
    ctx.translate(cx, cy);
    const drawX = -renderW / 2;
    const drawY = -renderH / 2;

    // Draw video
    ctx.drawImage(vid, drawX, drawY, renderW, renderH);

    // Glowing border
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.5 + beatPulse * 0.4})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(drawX, drawY, renderW, renderH);

    ctx.restore();
  }

  // Render photo with seamless feathered mask (completely removes hard square borders)
  renderFeatheredPortrait(img, drawX, drawY, renderW, renderH) {
    const ctx = this.ctx;
    const mw = Math.ceil(renderW);
    const mh = Math.ceil(renderH);

    if (this.maskCanvas.width !== mw || this.maskCanvas.height !== mh) {
      this.maskCanvas.width = mw;
      this.maskCanvas.height = mh;
    }
    const mCtx = this.maskCtx;
    mCtx.clearRect(0, 0, mw, mh);

    // 1. Draw raw photo
    mCtx.drawImage(img, 0, 0, mw, mh);

    // 2. Apply feathered alpha mask
    mCtx.globalCompositeOperation = 'destination-in';

    const radX = mw * 0.48;
    const radY = mh * 0.48;
    const maskGrad = mCtx.createRadialGradient(mw / 2, mh / 2, Math.min(radX, radY) * 0.65, mw / 2, mh / 2, Math.max(radX, radY));
    maskGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    maskGrad.addColorStop(0.72, 'rgba(0, 0, 0, 0.96)');
    maskGrad.addColorStop(0.88, 'rgba(0, 0, 0, 0.6)');
    maskGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    mCtx.fillStyle = maskGrad;
    mCtx.fillRect(0, 0, mw, mh);

    // Soft fade at bottom
    const bottomGrad = mCtx.createLinearGradient(0, mh * 0.70, 0, mh);
    bottomGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    bottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    mCtx.fillStyle = bottomGrad;
    mCtx.fillRect(0, mh * 0.70, mw, mh * 0.30);

    mCtx.globalCompositeOperation = 'source-over';

    ctx.drawImage(this.maskCanvas, drawX, drawY, renderW, renderH);
  }

  // Particles
  drawParticles(w, h, beatPulse) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    this.particles.forEach(p => {
      p.y += p.vy - beatPulse * 1.5;
      p.x += p.vx + Math.sin(this.time + p.y * 0.01) * 0.4;
      if (p.y < 0) {
        p.y = h;
        p.x = Math.random() * w;
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha * (0.6 + beatPulse * 0.4);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + beatPulse * 1.2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  // Bottom Equalizer
  drawBottomEqualizer(w, h, beatPulse) {
    const ctx = this.ctx;
    const barCount = 24;
    const barWidth = (w * 0.8) / barCount;
    const startX = w * 0.1;
    const baseY = h * 0.88;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < barCount; i++) {
      const mag = this.frequencyBars[i % this.frequencyBars.length] || 0;
      const barH = 4 + mag * 40 + (beatPulse * 15 * (1 - Math.abs(i - barCount / 2) / (barCount / 2)));
      const x = startX + i * barWidth;
      const y = baseY - barH;

      const grad = ctx.createLinearGradient(0, y, 0, baseY);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(0.6, '#a855f7');
      grad.addColorStop(1, '#ec4899');

      ctx.fillStyle = grad;
      ctx.fillRect(x + 2, y, barWidth - 4, barH);
    }

    ctx.restore();
  }

  // Vignette & Beat Strobe
  drawVignette(w, h, beatPulse) {
    const ctx = this.ctx;
    const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.78);
    vigGrad.addColorStop(0, 'transparent');
    vigGrad.addColorStop(1, 'rgba(2, 6, 23, 0.75)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

    if (beatPulse > 0.88) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(beatPulse - 0.88) * 0.35})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // Empty Stage (When no photo uploaded yet)
  drawEmptyStageState(w, h, beatPulse) {
    const ctx = this.ctx;
    const cx = w / 2;
    const cy = h * 0.44;

    ctx.save();
    ctx.strokeStyle = `rgba(168, 85, 247, ${0.4 + beatPulse * 0.3})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(cx - w * 0.32, cy - h * 0.22, w * 0.64, h * 0.44);
    ctx.setLineDash([]);

    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 22px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📷 写真・人物を設定してください', cx, cy - 10);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px "Noto Sans JP", sans-serif';
    ctx.fillText('操作画面からあなたの写真を取り込むと', cx, cy + 22);
    ctx.fillText('このステージの主役として華麗に歌い踊ります', cx, cy + 44);

    ctx.restore();
  }
}

if (typeof window !== 'undefined') {
  window.CharacterRenderer = CharacterRenderer;
}

```

### 5.5 `presets.js`

```javascript
/**
 * GrooveSync MV - Presets & Data Configuration
 */

const MOTION_PRESETS = {
  guitar: {
    id: 'guitar',
    name: 'エレキギター演奏',
    desc: 'リフを弾きながら熱唱',
    icon: '🎸',
    instrument: 'electric_guitar',
    swayFreq: 1.0,
    swayAmp: 18,
    headbobAmp: 15,
    strumSpeed: 2.0,
    cameraBias: 'dynamic',
    promptSnippet: 'playing an electric guitar vigorously, energetic rock guitar performance on stage, singing passionately into the camera, dynamic guitar riffs, body grooving to the beat'
  },
  acoustic: {
    id: 'acoustic',
    name: 'アコギ弾き語り',
    desc: 'コードをかき鳴らし体でリズム',
    icon: '🪕',
    instrument: 'acoustic_guitar',
    swayFreq: 0.8,
    swayAmp: 14,
    headbobAmp: 10,
    strumSpeed: 1.2,
    cameraBias: 'closeup',
    promptSnippet: 'acoustic guitar singer songwriter, fingerpicking and strumming acoustic guitar, gentle rhythmic swaying, warm intimate singing, emotional facial expressions'
  },
  keyboard: {
    id: 'keyboard',
    name: 'キーボード/ピアノ',
    desc: '鍵盤を演奏しながら歌唱',
    icon: '🎹',
    instrument: 'keyboard',
    swayFreq: 0.9,
    swayAmp: 12,
    headbobAmp: 12,
    strumSpeed: 1.5,
    cameraBias: 'closeup',
    promptSnippet: 'performing at an electric keyboard synthesizer, hands playing keys smoothly, expressive head bobbing to rhythm, singing heartfelt vocals'
  },
  dance: {
    id: 'dance',
    name: 'ダンス＆ステップ',
    desc: 'リズムに合わせた軽快な振付',
    icon: '💃',
    instrument: 'none',
    swayFreq: 1.3,
    swayAmp: 28,
    headbobAmp: 20,
    strumSpeed: 0,
    cameraBias: 'orbit',
    promptSnippet: 'dancing with energetic pop choreography, synchronized beat bounces, arm gestures, singing while doing stylish dance steps, lively stage performance'
  },
  sway: {
    id: 'sway',
    name: 'チル・ボディスウェイ',
    desc: '曲のグルーヴに体を揺らす',
    icon: '🌊',
    instrument: 'mic_hand',
    swayFreq: 0.6,
    swayAmp: 22,
    headbobAmp: 14,
    strumSpeed: 0,
    cameraBias: 'handheld',
    promptSnippet: 'relaxed rhythmic body swaying, lo-fi chill hip-hop groove, holding vintage microphone, gentle head nodding, subtle soulful lip sync'
  },
  headbang: {
    id: 'headbang',
    name: 'ロック・熱唱',
    desc: 'マイクを握りしめ激しく歌唱',
    icon: '⚡',
    instrument: 'mic_stand',
    swayFreq: 1.4,
    swayAmp: 24,
    headbobAmp: 30,
    strumSpeed: 0,
    cameraBias: 'dynamic',
    promptSnippet: 'intense rock singing, gripping microphone tightly with two hands, passionate headbanging, emotional belting, screaming facial expressions, intense stage presence'
  },
  dj: {
    id: 'dj',
    name: 'DJ & ビートバウンス',
    desc: 'スクラッチとリズムノリ',
    icon: '🎧',
    instrument: 'dj_deck',
    swayFreq: 1.2,
    swayAmp: 20,
    headbobAmp: 22,
    strumSpeed: 1.8,
    cameraBias: 'dynamic',
    promptSnippet: 'DJ bouncing behind turntables, one hand on headphones and one hand scratching, rhythmic head nodding, pumping up the crowd, lip-syncing hype vocals'
  }
};

const CHARACTER_PRESETS = {
  'anime-rock': {
    id: 'anime-rock',
    name: 'アスカ (ロックシンガー)',
    hairColor: '#e11d48',
    eyeColor: '#f43f5e',
    skinTone: '#fde8df',
    outfitColor: '#1e1b4b',
    guitarColor: '#e11d48',
    styleName: 'Anime Rock Vocalist',
    prompt: 'Japanese anime female rock lead singer, crimson red twin tails hair, sharp vivid eyes, black leather biker jacket, stylish stage accessories, anime illustration style'
  },
  'cyber-idol': {
    id: 'cyber-idol',
    name: 'ルナ (サイバーポップ)',
    hairColor: '#06b6d4',
    eyeColor: '#38bdf8',
    skinTone: '#fef2f2',
    outfitColor: '#4f46e5',
    guitarColor: '#06b6d4',
    styleName: 'Cyberpunk VTuber Idol',
    prompt: 'futuristic cyberpunk female idol singer, cyan and violet luminous hair with glowing cyber hairclips, hologram jacket, glowing stage mic, vibrant digital aesthetic'
  },
  'indie-boy': {
    id: 'indie-boy',
    name: 'レン (シティポップ/弾き語り)',
    hairColor: '#334155',
    eyeColor: '#059669',
    skinTone: '#fcedde',
    outfitColor: '#0f766e',
    guitarColor: '#b45309',
    styleName: 'Indie Singer Songwriter',
    prompt: 'cool Japanese male indie musician, messy dark hair, thoughtful handsome face, oversized casual knit sweater, vintage acoustic guitar, warm natural cinematic lighting'
  },
  'lofi-girl': {
    id: 'lofi-girl',
    name: 'ミオ (チル/Lo-Fi)',
    hairColor: '#d97706',
    eyeColor: '#ec4899',
    skinTone: '#fff1f2',
    outfitColor: '#831843',
    guitarColor: '#f59e0b',
    styleName: 'Lo-Fi Chill Hop Singer',
    prompt: 'aesthetic lo-fi female vocalist wearing large studio headphones, warm brown bob haircut, oversized pastel hoodie, nostalgic warm tones, cozy studio atmosphere'
  }
};

const DEMO_SONGS = {
  jpop: {
    id: 'jpop',
    title: 'Shining Beat',
    genre: 'J-POP / アイドル',
    bpm: 132,
    desc: 'BPM 132 • 明るいメロディとギターカッティング',
    recommendedMotion: 'guitar',
    lyrics: [
      { time: 0, text: '輝くライトが ステージ照らし出す' },
      { time: 4, text: '胸の鼓動が リズムと重なって' },
      { time: 8, text: '世界中へ響け このメロディ！' },
      { time: 14, text: '君の手を取って 走り出そう' },
      { time: 20, text: 'Shining Beat! 奇跡を起こす瞬間へ' },
      { time: 26, text: 'どこまでも高く 歌い続けるよ' }
    ]
  },
  lofi: {
    id: 'lofi',
    title: 'Midnight Groove',
    genre: 'チル / ヒップホップ',
    bpm: 88,
    desc: 'BPM 88 • 首を揺らす重厚なビートとローズピアノ',
    recommendedMotion: 'sway',
    lyrics: [
      { time: 0, text: '深夜2時の街街 灯りが滲む' },
      { time: 6, text: '緩やかなビートに 体を預けて' },
      { time: 12, text: '誰も知らない秘密のグルーヴ' },
      { time: 18, text: '漂うように 揺れるこの夜' },
      { time: 24, text: '言葉はいらない そのままでいい' }
    ]
  },
  rock: {
    id: 'rock',
    title: 'Overdrive Ignition',
    genre: 'エモーショナル・ロック',
    bpm: 148,
    desc: 'BPM 148 • 激しいギターリフと疾走ドラム',
    recommendedMotion: 'guitar',
    lyrics: [
      { time: 0, text: '歪んだコードが 鼓膜を突き破る' },
      { time: 5, text: '限界なんて 壊して突き進め' },
      { time: 10, text: '魂の叫びを ここで解き放て！' },
      { time: 16, text: '燃え盛る情熱 Overdrive!' },
      { time: 22, text: '立ち止まる暇なんてない' },
      { time: 27, text: '響け 燃え尽きるまで！' }
    ]
  },
  cyber: {
    id: 'cyber',
    title: 'Neon Skyline',
    genre: 'フューチャー・EDM',
    bpm: 128,
    desc: 'BPM 128 • ドロップに合わせてバウンス',
    recommendedMotion: 'dance',
    lyrics: [
      { time: 0, text: 'Neon lights reflecting in the sky' },
      { time: 6, text: 'Digital dream waking up tonight' },
      { time: 12, text: 'Feel the bass drop down to the ground!' },
      { time: 18, text: 'Bounce with the frequency, higher now!' },
      { time: 24, text: 'We are limitless in cyber horizon' }
    ]
  }
};

const STAGE_THEMES = {
  livehouse: {
    id: 'livehouse',
    name: 'ライブハウス',
    bgGradient: ['#090514', '#170b2c', '#030108'],
    lasers: ['#ec4899', '#8b5cf6', '#06b6d4'],
    smokeDensity: 0.6,
    floorReflection: true
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'サイバーネオン都市',
    bgGradient: ['#020b14', '#082f49', '#030712'],
    lasers: ['#06b6d4', '#10b981', '#3b82f6'],
    smokeDensity: 0.4,
    floorReflection: true
  },
  sunset: {
    id: 'sunset',
    name: '夕暮れルーフトップ',
    bgGradient: ['#1c102a', '#701a75', '#f97316'],
    lasers: ['#f59e0b', '#fb923c', '#ec4899'],
    smokeDensity: 0.2,
    floorReflection: false
  },
  studio: {
    id: 'studio',
    name: 'スタジオ・ミニマル',
    bgGradient: ['#111827', '#1f2937', '#030712'],
    lasers: ['#64748b', '#94a3b8', '#cbd5e1'],
    smokeDensity: 0.1,
    floorReflection: false
  }
};

const OFFICIAL_SAMPLE = {
  id: 'official-vocalist',
  name: 'ミレイ (実力派女性シンガー)',
  imagePath: 'sample-vocalist.jpg',
  mouthPosYRatio: 0.44,
  song: 'jpop',
  title: 'Shining Beat',
  desc: 'クリアな歌声と母音連動の本格リップシンクMVサンプル'
};

window.GROOVE_PRESETS = {
  sample: OFFICIAL_SAMPLE,
  motions: MOTION_PRESETS,
  characters: CHARACTER_PRESETS,
  songs: DEMO_SONGS,
  stages: STAGE_THEMES
};


```

### 5.6 `style.css`

```css
/* GrooveSync MV Studio - Fullscreen Accessible & Large Text Stylesheet */

:root {
  --bg-primary: #0a0e17;
  --bg-surface: #111827;
  --bg-card: #1e293b;
  --bg-card-active: #2e1065;

  --accent-primary: #8b5cf6;
  --accent-pink: #ec4899;
  --accent-cyan: #06b6d4;
  --accent-amber: #f59e0b;
  --accent-green: #10b981;
  --accent-red: #ef4444;

  --text-main: #ffffff;
  --text-sub: #cbd5e1;
  --text-muted: #94a3b8;

  --border-subtle: rgba(255, 255, 255, 0.16);
  --border-active: #a855f7;

  --radius-sm: 12px;
  --radius-md: 18px;
  --radius-lg: 24px;
  --radius-full: 9999px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

html, body {
  background-color: var(--bg-primary);
  color: var(--text-main);
  font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 17px;
  line-height: 1.5;
  -webkit-text-size-adjust: 100%;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  position: relative;
}

.app-root {
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
  max-width: 580px;
  margin: 0 auto;
  position: relative;
  background-color: var(--bg-primary);
  overflow-x: hidden;
}

.hidden,
[hidden] {
  display: none !important;
}

/* ==========================================================================
   Top Screen Mode Switcher (操作画面 ⇔ MV映像)
   ========================================================================== */
.top-mode-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(10, 14, 23, 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 2px solid var(--border-subtle);
  padding-top: max(10px, calc(6px + env(safe-area-inset-top, 0px)));
  padding-bottom: 10px;
  padding-left: max(12px, env(safe-area-inset-left, 12px));
  padding-right: max(12px, env(safe-area-inset-right, 12px));
  width: 100%;
  box-sizing: border-box;
}

.mode-switch-container {
  display: flex;
  gap: 10px;
  background: #111827;
  padding: 6px;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--border-subtle);
}

.main-mode-btn {
  flex: 1;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 6px 10px;
  user-select: none;
}

.main-mode-btn:active {
  transform: scale(0.96);
}

.main-mode-btn.pulse-anim {
  animation: tabPulse 0.35s ease;
}

@keyframes tabPulse {
  0% { transform: scale(1); }
  50% { transform: scale(0.96); background: rgba(168, 85, 247, 0.3); }
  100% { transform: scale(1); }
}

.main-mode-btn.active {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(168, 85, 247, 0.45);
}

.mode-btn-icon {
  font-size: 1.8rem;
  line-height: 1;
}

.mode-btn-text {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.mode-btn-text strong {
  font-size: 1.15rem;
  font-weight: 900;
  line-height: 1.2;
}

.mode-btn-text span {
  font-size: 0.78rem;
  font-weight: 700;
  opacity: 0.95;
}

/* Accessibility Bar: 大画面・特大文字切り替え ＆ 最新版リロードボタン */
.header-accessibility-bar {
  margin-top: 4px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
}

.app-reload-btn {
  width: 100%;
  min-width: 0;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: linear-gradient(135deg, #10b981, #059669);
  border: 2px solid #6ee7b7;
  border-radius: var(--radius-sm);
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 8px 8px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-reload-btn:active {
  transform: scale(0.96);
  background: #047857;
}

.reload-icon {
  font-size: 1.15rem;
  flex-shrink: 0;
}

.zoom-toggle-btn {
  grid-column: 1 / -1;
  width: 100%;
  min-width: 0;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #1e293b;
  border: 2px solid #38bdf8;
  border-radius: var(--radius-sm);
  color: #ffffff;
  font-size: 1.02rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 8px 12px;
}

.zoom-toggle-btn:active {
  transform: scale(0.97);
}

.zoom-toggle-btn.active {
  background: linear-gradient(135deg, #0284c7, #0369a1);
  border-color: #fef08a;
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.55);
}

.zoom-icon {
  font-size: 1.35rem;
}

.zoom-status-badge {
  background: rgba(255, 255, 255, 0.2);
  font-size: 0.82rem;
  font-weight: 900;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  margin-left: 6px;
  letter-spacing: 0.5px;
}

.zoom-toggle-btn.active .zoom-status-badge {
  background: #fef08a;
  color: #0f172a;
}

/* ==========================================================================
   VIEW 1: 操作画面
   ========================================================================== */
.main-view {
  display: none;
  padding-top: 16px;
  padding-left: max(14px, env(safe-area-inset-left, 14px));
  padding-right: max(14px, env(safe-area-inset-right, 14px));
  padding-bottom: calc(90px + env(safe-area-inset-bottom, 20px));
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.main-view.active-view {
  display: block;
}

/* Flow Guide Banner (ステップ矢印解説) */
.flow-guide-card {
  background: linear-gradient(135deg, rgba(30, 27, 75, 0.9), rgba(15, 23, 42, 0.95));
  border: 2px solid rgba(168, 85, 247, 0.4);
  border-radius: var(--radius-md);
  padding: 14px 14px;
  margin-bottom: 18px;
}

.flow-badge {
  display: inline-block;
  font-size: 0.88rem;
  font-weight: 900;
  color: #fef08a;
  margin-bottom: 10px;
}

.flow-steps-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.flow-chip {
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 10px;
  border-radius: var(--radius-full);
  font-size: 0.82rem;
  font-weight: 700;
  color: #ffffff;
  border: 1px solid var(--border-subtle);
}

.flow-chip.highlight {
  background: rgba(6, 182, 212, 0.25);
  border-color: var(--accent-cyan);
  color: #67e8f9;
}

.flow-chip.rec {
  background: rgba(239, 68, 68, 0.25);
  border-color: var(--accent-red);
  color: #fca5a5;
}

.flow-arrow {
  color: var(--accent-cyan);
  font-weight: 900;
  font-size: 0.95rem;
}

/* Master Player Card */
.master-player-card {
  background: linear-gradient(180deg, #1e293b, #0f172a);
  border: 2px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 18px 16px;
  margin-bottom: 24px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
}

.now-playing-info {
  margin-bottom: 16px;
}

.now-playing-label {
  font-size: 0.85rem;
  color: var(--accent-cyan);
  font-weight: 700;
  text-transform: uppercase;
}

.now-playing-title {
  font-size: 1.45rem;
  font-weight: 900;
  color: #ffffff;
  margin: 4px 0 6px;
  line-height: 1.3;
}

.now-playing-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.range-badge {
  background: rgba(168, 85, 247, 0.25);
  border: 1.5px solid var(--accent-primary);
  color: #e9d5ff;
  font-size: 0.82rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: var(--radius-full);
}

.now-playing-time {
  font-size: 0.95rem;
  color: var(--text-muted);
  font-weight: 600;
}

.master-btn-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 14px;
}

.giant-btn {
  min-height: 64px;
  border-radius: var(--radius-md);
  border: none;
  font-size: 1.25rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.15s, opacity 0.15s;
}

.giant-btn:active {
  transform: scale(0.98);
}

.giant-play-btn {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: #ffffff;
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
}

.giant-icon {
  font-size: 1.6rem;
  line-height: 1;
}

.giant-rec-btn {
  background: rgba(239, 68, 68, 0.15);
  border: 2.5px solid var(--accent-red);
  color: #ffffff;
}

.rec-dot {
  width: 16px;
  height: 16px;
  background-color: var(--accent-red);
  border-radius: 50%;
  box-shadow: 0 0 10px var(--accent-red);
}

.giant-rec-btn.recording .rec-dot {
  border-radius: 3px;
  animation: pulse-rec 1s infinite;
}

@keyframes pulse-rec {
  0%, 100% { background-color: #ef4444; }
  50% { background-color: #991b1b; }
}

.view-stage-banner-btn {
  width: 100%;
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(245, 158, 11, 0.14);
  border: 2px solid var(--accent-amber);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  color: #ffffff;
  cursor: pointer;
  text-align: left;
}

.banner-icon {
  font-size: 2rem;
  line-height: 1;
}

.banner-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.banner-text strong {
  font-size: 1.05rem;
  font-weight: 800;
  color: #fef08a;
}

.banner-text span {
  font-size: 0.82rem;
  color: #fef9c3;
  opacity: 0.9;
}

.banner-arrow {
  font-size: 1.6rem;
  font-weight: 900;
  color: var(--accent-amber);
}

/* Sections */
.large-section {
  margin-bottom: 34px;
}

.section-title-wrap {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.step-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: #ffffff;
  font-size: 1.15rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-badge.highlight-badge {
  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-primary));
}

.section-title {
  font-size: 1.35rem;
  font-weight: 900;
  color: #ffffff;
  line-height: 1.25;
}

.section-sub {
  font-size: 0.9rem;
  color: var(--text-sub);
  margin-top: 3px;
}

.sub-block-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: #e2e8f0;
  margin: 18px 0 10px;
}

/* Giant Accessible Cards List */
.giant-cards-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.accessible-card {
  min-height: 84px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg-card);
  border: 2px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  text-align: left;
  cursor: pointer;
  color: #ffffff;
  transition: all 0.15s ease;
  width: 100%;
}

.accessible-card:active {
  transform: scale(0.98);
}

.accessible-card.active {
  background: var(--bg-card-active);
  border-color: #c084fc;
  box-shadow: 0 0 20px rgba(192, 132, 252, 0.45);
}

.card-icon-big {
  font-size: 2.5rem;
  line-height: 1;
  flex-shrink: 0;
}

.avatar-badge-preview {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 3px solid rgba(255, 255, 255, 0.4);
}

.preview-anime-rock { background: linear-gradient(135deg, #f43f5e, #8b5cf6); }
.preview-indie-boy { background: linear-gradient(135deg, #10b981, #0284c7); }
.preview-cyber-idol { background: linear-gradient(135deg, #06b6d4, #3b82f6); }
.preview-lofi-girl { background: linear-gradient(135deg, #f59e0b, #ec4899); }

.card-content-big {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.card-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-head-row h4 {
  font-size: 1.15rem;
  font-weight: 800;
  color: #ffffff;
}

.status-pill {
  font-size: 0.8rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.12);
  color: var(--text-muted);
}

.accessible-card.active .status-pill.selected {
  background: #a855f7;
  color: #ffffff;
}

.card-content-big p {
  font-size: 0.92rem;
  color: var(--text-sub);
  line-height: 1.45;
}

/* Giant Action Cards (Audio & Photo upload) */
.giant-action-card {
  min-height: 86px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(139, 92, 246, 0.12);
  border: 2.5px dashed #a855f7;
  border-radius: var(--radius-md);
  padding: 16px 18px;
  color: #ffffff;
  cursor: pointer;
  margin-bottom: 14px;
  position: relative;
  text-align: left;
  width: 100%;
}

.giant-action-card:active {
  background: rgba(139, 92, 246, 0.25);
}

.giant-action-card.mic-card {
  background: rgba(6, 182, 212, 0.12);
  border: 2.5px solid var(--accent-cyan);
}

.giant-action-card.mic-card.active {
  background: rgba(239, 68, 68, 0.2);
  border-color: var(--accent-red);
}

.action-card-icon {
  font-size: 2.6rem;
  line-height: 1;
  flex-shrink: 0;
}

.action-card-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-card-text strong {
  font-size: 1.18rem;
  font-weight: 900;
  color: #ffffff;
}

.action-card-text span {
  font-size: 0.88rem;
  color: var(--text-sub);
}

.hidden-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}

.sr-only-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
  opacity: 0;
}

.giant-action-card.applied {
  background: rgba(16, 185, 129, 0.16) !important;
  border: 2.5px solid #10b981 !important;
  box-shadow: 0 0 22px rgba(16, 185, 129, 0.4) !important;
}

.avatar-preview-wrap {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  position: relative;
}

.avatar-preview-img {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #10b981;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.5);
  display: block;
}

.avatar-preview-img.hidden,
.action-card-icon.hidden {
  display: none !important;
}

/* Custom Avatar Applied Banner */
.custom-avatar-banner {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(6, 182, 212, 0.12));
  border: 2.5px solid #10b981;
  border-radius: var(--radius-md);
  padding: 16px 18px;
  margin-top: -4px;
  margin-bottom: 20px;
  box-shadow: 0 6px 24px rgba(16, 185, 129, 0.25);
  animation: fadeInBanner 0.3s ease-out;
}

@keyframes fadeInBanner {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.custom-avatar-banner.hidden {
  display: none !important;
}

.custom-avatar-banner-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.custom-avatar-check-badge {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #10b981;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  font-weight: 900;
  flex-shrink: 0;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
}

.custom-avatar-banner-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.custom-avatar-banner-text strong {
  font-size: 1.05rem;
  font-weight: 800;
  color: #ffffff;
}

.custom-avatar-banner-text span {
  font-size: 0.88rem;
  color: #a7f3d0;
}

.custom-avatar-btn-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.avatar-action-btn {
  min-height: 46px;
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: all 0.2s ease;
}

.avatar-action-btn.primary-stage-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
  flex: 1 1 180px;
}

.avatar-action-btn.primary-stage-btn:active {
  transform: scale(0.97);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.avatar-action-btn.secondary-btn {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  flex: 0 1 auto;
}

.avatar-action-btn.secondary-btn:active {
  background: rgba(255, 255, 255, 0.2);
}

.avatar-action-btn.text-link-btn {
  background: transparent;
  color: var(--text-sub);
  text-decoration: underline;
  padding: 6px 10px;
  min-height: 38px;
  font-size: 0.88rem;
}

/* ==========================================================================
   STEP 3: Trimmer Card (楽曲の長さ・動画にする区間の調整)
   ========================================================================== */
.trimmer-card {
  background: linear-gradient(180deg, #1e1b4b, #0f172a);
  border: 2px solid var(--accent-cyan);
  border-radius: var(--radius-md);
  padding: 20px 18px;
  box-shadow: 0 6px 25px rgba(6, 182, 212, 0.2);
}

/* ★ Full Song Previewer & Seconds Monitor Box */
.song-full-preview-box {
  background: rgba(0, 0, 0, 0.55);
  border: 2px solid rgba(56, 189, 248, 0.4);
  border-radius: var(--radius-sm);
  padding: 16px 16px;
  margin-bottom: 18px;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.4);
}

.preview-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.preview-box-tag {
  font-size: 0.95rem;
  font-weight: 800;
  color: #38bdf8;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.preview-box-hint {
  font-size: 0.8rem;
  color: var(--text-muted);
}

/* Big Seconds Display (2-row layout: zero overlap & zero vertical jitter) */
.current-time-large-display {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 6px;
  background: rgba(15, 23, 42, 0.9);
  border: 1.5px solid rgba(56, 189, 248, 0.35);
  border-radius: 12px;
  padding: 10px 14px;
  margin-bottom: 14px;
}

.time-display-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 28px;
}

.time-readout-wrap {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  width: 100%;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  padding-top: 2px;
}

.time-label {
  font-size: 0.86rem;
  font-weight: 800;
  color: #cbd5e1;
  white-space: nowrap;
}

.time-counter-big {
  display: inline-block;
  min-width: 5.2ch;
  text-align: right;
  font-size: 2.15rem;
  line-height: 1.1;
  font-weight: 900;
  color: #4ade80;
  text-shadow: 0 0 16px rgba(74, 222, 128, 0.5);
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.time-slash {
  font-size: 1.35rem;
  color: #94a3b8;
  font-weight: 800;
}

.time-counter-total {
  display: inline-block;
  min-width: 5.2ch;
  text-align: left;
  font-size: 1.45rem;
  line-height: 1.1;
  font-weight: 800;
  color: #f8fafc;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.player-status-badge {
  font-size: 0.85rem;
  font-weight: 900;
  padding: 4px 12px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.12);
  color: #f1f5f9;
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.player-status-badge.playing {
  background: rgba(34, 197, 94, 0.28);
  color: #86efac;
  border-color: #22c55e;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.4);
}

/* Timeline & Seek Bar */
.timeline-visual-container {
  position: relative;
  padding: 10px 0 6px 0;
  user-select: none;
}

.timeline-track {
  height: 22px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 11px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.5);
}

.timeline-selection-range {
  position: absolute;
  top: 0;
  bottom: 0;
  background: linear-gradient(90deg, rgba(6, 182, 212, 0.55), rgba(168, 85, 247, 0.55));
  border-left: 2px solid #38bdf8;
  border-right: 2px solid #a855f7;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  transition: left 0.1s ease-out, width 0.1s ease-out;
}

.selection-range-label {
  font-size: 0.72rem;
  font-weight: 800;
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  padding: 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timeline-playhead {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 4px;
  background: #ffffff;
  border-radius: 2px;
  box-shadow: 0 0 8px #ffffff, 0 0 16px rgba(56, 189, 248, 0.8);
  pointer-events: none;
  transform: translateX(-50%);
  z-index: 2;
  transition: left 0.05s linear;
}

.timeline-seek-slider {
  position: absolute;
  top: 6px;
  left: 0;
  width: 100%;
  height: 30px;
  opacity: 0;
  cursor: pointer;
  z-index: 3;
  margin: 0;
}

.timeline-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.76rem;
  color: #94a3b8;
  font-weight: 600;
  margin-top: 6px;
  padding: 0 2px;
}

/* Full Player Button Row */
.full-player-controls-row {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 10px;
  margin-top: 14px;
}

.giant-play-inline-btn {
  flex: 1 1 180px;
  min-height: 50px;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  border: 1.5px solid #38bdf8;
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 800;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 15px rgba(2, 132, 199, 0.4);
  transition: all 0.15s ease;
}

.giant-play-inline-btn:active {
  transform: scale(0.97);
}

.btn-sub-action {
  min-height: 50px;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 0.92rem;
  font-weight: 700;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.btn-sub-action:active {
  transform: scale(0.96);
  background: rgba(255, 255, 255, 0.2);
}

/* ★ The Sync to Start & End Buttons */
.set-endpoints-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.btn-start-sync-action {
  width: 100%;
  min-height: 52px;
  padding: 12px 18px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: 2px solid #fcd34d;
  color: #ffffff;
  font-size: 1.02rem;
  font-weight: 900;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
  transition: all 0.15s ease;
}

.btn-start-sync-action:active {
  transform: scale(0.96);
}

.btn-start-sync-action .btn-icon {
  font-size: 1.25rem;
}

.btn-end-sync-action {
  width: 100%;
  min-height: 52px;
  padding: 12px 18px;
  background: linear-gradient(135deg, #ec4899, #be185d);
  border: 2px solid #f472b6;
  color: #ffffff;
  font-size: 1.02rem;
  font-weight: 900;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);
  transition: all 0.15s ease;
}

.btn-end-sync-action:active {
  transform: scale(0.96);
}

.btn-end-sync-action .btn-icon {
  font-size: 1.25rem;
}

.preview-helper-text {
  font-size: 0.82rem;
  color: #fef08a;
  background: rgba(234, 179, 8, 0.12);
  border: 1px solid rgba(234, 179, 8, 0.3);
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 12px;
  line-height: 1.45;
  font-weight: 600;
}

.trimmer-status-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.45);
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-sm);
  padding: 12px 12px;
  gap: 8px;
  margin-bottom: 16px;
}

.trim-stat {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stat-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  white-space: nowrap;
}

.stat-val {
  font-size: 1.2rem;
  font-weight: 900;
  color: #ffffff;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.stat-val.highlight {
  color: #fef08a;
  font-size: 1.32rem;
}

.trim-arrow {
  font-size: 1.2rem;
  color: var(--accent-cyan);
  font-weight: 900;
  flex-shrink: 0;
}

.trim-presets-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: #e2e8f0;
  margin-bottom: 10px;
}

.trim-presets-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.trim-preset-chip {
  min-height: 48px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.08);
  border: 1.5px solid var(--border-subtle);
  color: #ffffff;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  padding: 6px 10px;
  text-align: center;
  transition: all 0.15s;
}

.trim-preset-chip:active {
  transform: scale(0.96);
}

.trim-preset-chip.active {
  background: var(--accent-cyan);
  border-color: var(--accent-cyan);
  color: #000000;
  font-weight: 900;
  box-shadow: 0 2px 12px rgba(6, 182, 212, 0.5);
}

.slider-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slider-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slider-name {
  font-size: 1.05rem;
  font-weight: 800;
  color: #ffffff;
}

.slider-val-badge {
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--accent-cyan);
}

.slider-subtext {
  font-size: 0.82rem;
  color: var(--text-muted);
}

.super-fat-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 16px;
  background: rgba(255, 255, 255, 0.22);
  border-radius: 8px;
  outline: none;
  margin: 6px 0;
}

.super-fat-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #a855f7;
  cursor: pointer;
  box-shadow: 0 0 16px rgba(168, 85, 247, 0.8);
  border: 3.5px solid #ffffff;
}

.giant-secondary-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid var(--border-subtle);
  color: #ffffff;
  font-size: 1.05rem;
  width: 100%;
}

/* ==========================================================================
   STEP 5: Export Banner Card
   ========================================================================== */
.export-banner-card {
  background: linear-gradient(180deg, #1e293b, #0f172a);
  border: 2px solid var(--accent-red);
  border-radius: var(--radius-md);
  padding: 20px 18px;
}

.export-banner-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.export-big-icon {
  font-size: 2.8rem;
  line-height: 1;
}

.export-banner-head h4 {
  font-size: 1.22rem;
  font-weight: 900;
  color: #ffffff;
  line-height: 1.3;
}

.export-banner-head p {
  font-size: 0.88rem;
  color: var(--text-sub);
  margin-top: 2px;
}

/* ==========================================================================
   VIEW 2: MV映像 (全画面)
   ========================================================================== */
.stage-view-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 200;
  width: 100vw;
  height: 100vh;
  background: #000000;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.stage-view-fullscreen.hidden {
  display: none;
}

#stageCanvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}

.stage-fullscreen-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  padding-top: calc(16px + env(safe-area-inset-top, 16px));
}

.stage-back-btn {
  min-height: 52px;
  padding: 0 20px;
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(14px);
  border: 2px solid rgba(255, 255, 255, 0.35);
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
}

.stage-back-btn:active {
  transform: scale(0.95);
}

.stage-mode-indicator {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  border-radius: var(--radius-full);
  font-size: 0.9rem;
  font-weight: 800;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  color: #e2e8f0;
}

.stage-center-lyrics {
  position: relative;
  z-index: 10;
  text-align: center;
  padding: 0 20px;
  margin-top: 10px;
  text-shadow: 0 3px 14px rgba(0, 0, 0, 0.95);
}

.stage-center-lyrics h2 {
  font-size: 1.5rem;
  font-weight: 900;
  color: #ffffff;
  line-height: 1.35;
}

.stage-viseme-badge {
  position: absolute;
  top: 90px;
  right: 16px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.7);
  padding: 6px 14px;
  border-radius: var(--radius-full);
  border: 1.5px solid var(--border-subtle);
  font-size: 0.85rem;
  color: var(--text-sub);
}

.stage-viseme-badge strong {
  color: var(--accent-cyan);
  font-size: 1.1rem;
}

.stage-fullscreen-footer {
  position: relative;
  z-index: 10;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.92) 40%);
  padding: 20px 16px calc(20px + env(safe-area-inset-bottom, 20px));
}

.stage-progress-bar {
  width: 100%;
  height: 10px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 5px;
  position: relative;
  cursor: pointer;
  overflow: hidden;
  margin-bottom: 14px;
}

.stage-progress-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, var(--accent-cyan), var(--accent-pink));
  border-radius: 5px;
}

.stage-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stage-song-info {
  display: flex;
  flex-direction: column;
}

.stage-song-info strong {
  font-size: 1.15rem;
  font-weight: 900;
  color: #ffffff;
}

.stage-song-info span {
  font-size: 0.9rem;
  color: var(--text-sub);
}

.stage-footer-btns {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stage-circle-btn {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #ffffff;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.8);
  transition: transform 0.15s;
}

.stage-circle-btn:active {
  transform: scale(0.92);
}

.stage-circle-btn.play {
  background: linear-gradient(135deg, var(--accent-primary), var(--accent-pink));
}

.stage-circle-btn.rec {
  background: rgba(0, 0, 0, 0.6);
  border: 2.5px solid var(--accent-red);
}

.stage-rec-dot {
  width: 18px;
  height: 18px;
  background-color: var(--accent-red);
  border-radius: 50%;
}

.stage-circle-btn.rec.recording .stage-rec-dot {
  border-radius: 4px;
  animation: pulse-rec 1s infinite;
}

/* Toast */
.toast {
  position: fixed;
  bottom: calc(24px + env(safe-area-inset-bottom, 20px));
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.98);
  border: 2px solid var(--accent-primary);
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.9);
  color: #ffffff;
  padding: 14px 20px;
  border-radius: 18px;
  font-size: 0.98rem;
  font-weight: 800;
  z-index: 1000;
  transition: opacity 0.25s, transform 0.25s;
  width: max-content;
  max-width: calc(100vw - 28px);
  white-space: normal;
  word-break: break-word;
  text-align: center;
  line-height: 1.45;
  box-sizing: border-box;
}

.toast.hidden {
  display: none !important;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 20px);
}

/* ==========================================================================
   SUPER ACCESSIBLE LARGE MODE (文字・ボタン特大モード)
   視力に不安のあるユーザー向けに、文字とボタンを極限まで拡大・強調するモード
   ========================================================================== */
body.zoom-huge {
  font-size: 21px;
  line-height: 1.6;
}

body.zoom-huge .app-root {
  max-width: 680px;
}

body.zoom-huge .main-mode-btn {
  min-height: 70px;
}

body.zoom-huge .mode-btn-text strong {
  font-size: 1.35rem;
}

body.zoom-huge .mode-btn-text span {
  font-size: 0.92rem;
}

body.zoom-huge .zoom-toggle-btn {
  min-height: 58px;
  font-size: 1.2rem;
  border-width: 3px;
}

body.zoom-huge .flow-badge {
  font-size: 1.08rem;
}

body.zoom-huge .flow-chip {
  font-size: 0.98rem;
  padding: 8px 14px;
}

body.zoom-huge .now-playing-title {
  font-size: 1.75rem;
}

body.zoom-huge .range-badge {
  font-size: 0.98rem;
  padding: 6px 14px;
}

body.zoom-huge .now-playing-time {
  font-size: 1.15rem;
}

body.zoom-huge .giant-btn {
  min-height: 76px;
  font-size: 1.4rem;
  border-radius: 20px;
}

body.zoom-huge .giant-icon {
  font-size: 1.9rem;
}

body.zoom-huge .rec-dot {
  width: 18px;
  height: 18px;
}

body.zoom-huge .view-stage-banner-btn {
  min-height: 82px;
  padding: 16px 18px;
}

body.zoom-huge .banner-text strong {
  font-size: 1.25rem;
}

body.zoom-huge .banner-text span {
  font-size: 1.02rem;
}

body.zoom-huge .step-badge {
  width: 48px;
  height: 48px;
  font-size: 1.5rem;
}

body.zoom-huge .section-title {
  font-size: 1.65rem;
}

body.zoom-huge .section-sub {
  font-size: 1.1rem;
}

body.zoom-huge .sub-block-title {
  font-size: 1.2rem;
}

body.zoom-huge .giant-action-card {
  min-height: 88px;
  padding: 18px 16px;
  border-width: 2.5px;
}

body.zoom-huge .avatar-preview-wrap,
body.zoom-huge .avatar-preview-img {
  width: 68px;
  height: 68px;
}

body.zoom-huge .action-card-icon {
  font-size: 2.6rem;
}

body.zoom-huge .action-card-text strong {
  font-size: 1.35rem;
}

body.zoom-huge .action-card-text span {
  font-size: 1.05rem;
}

body.zoom-huge .accessible-card {
  min-height: 92px;
  padding: 18px 16px;
  border-width: 2.5px;
}

body.zoom-huge .accessible-card.active {
  border-width: 3.5px;
  border-color: #c084fc;
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.6), 0 8px 30px rgba(0, 0, 0, 0.8);
}

body.zoom-huge .card-content-big h4 {
  font-size: 1.35rem;
}

body.zoom-huge .card-content-big p {
  font-size: 1.08rem;
}

body.zoom-huge .status-pill {
  font-size: 0.95rem;
  padding: 6px 14px;
}

body.zoom-huge .avatar-badge-preview {
  width: 66px;
  height: 66px;
}

body.zoom-huge .card-icon-big {
  font-size: 2.6rem;
}

body.zoom-huge .trimmer-status-box {
  padding: 16px;
}

body.zoom-huge .stat-label {
  font-size: 1.0rem;
}

body.zoom-huge .stat-val {
  font-size: 1.7rem;
}

body.zoom-huge .slider-value-bubble {
  font-size: 1.25rem;
  min-width: 74px;
  padding: 8px 14px;
}

body.zoom-huge input[type="range"]::-webkit-slider-thumb {
  width: 46px;
  height: 46px;
}

body.zoom-huge input[type="range"]::-moz-range-thumb {
  width: 46px;
  height: 46px;
}

body.zoom-huge .trim-preset-chip {
  min-height: 58px;
  font-size: 1.15rem;
}

body.zoom-huge .toast {
  font-size: 1.2rem;
  padding: 16px 30px;
}

/* ==========================================================================
   STEP 3: Direct Minute / Second Input & Ultra-Legible Trimmer Controls
   ========================================================================== */
.trim-direct-input-card {
  background: rgba(15, 23, 42, 0.85);
  border: 2px solid rgba(56, 189, 248, 0.45);
  border-radius: var(--radius-sm);
  padding: 16px 14px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
}

.input-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.input-card-title {
  font-size: 1.15rem;
  font-weight: 900;
  color: #f8fafc;
}

.input-card-badge {
  font-size: 1.05rem;
  font-weight: 900;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.2);
  border: 1.5px solid #38bdf8;
  padding: 5px 12px;
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.min-sec-input-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin-bottom: 12px;
}

.time-input-group {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  background: #000000;
  border: 2.5px solid #38bdf8;
  border-radius: 10px;
  padding: 4px 10px;
  transition: all 0.2s ease;
}

.time-input-group:focus-within {
  border-color: #fde047;
  box-shadow: 0 0 14px rgba(253, 224, 71, 0.5);
}

.time-num-input {
  min-width: 0;
  width: 100%;
  flex: 1;
  height: 50px;
  background: transparent;
  border: none;
  color: #ffffff;
  font-size: 1.85rem;
  font-weight: 900;
  text-align: center;
  font-family: ui-monospace, SFMono-Regular, monospace;
  outline: none;
}

.time-input-group.dur-group {
  max-width: 220px;
}

.time-input-group.end-group {
  border-color: #f472b6;
}

.time-input-group.end-group .time-unit {
  color: #f472b6;
}

.time-unit {
  font-size: 1.15rem;
  font-weight: 900;
  color: #38bdf8;
  margin-left: 4px;
  flex-shrink: 0;
}

.time-colon {
  font-size: 1.9rem;
  font-weight: 900;
  color: #94a3b8;
}

.stepper-buttons-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.stepper-buttons-row.inline-stepper {
  display: flex;
  gap: 8px;
  flex: 1;
}

.stepper-btn {
  min-height: 48px;
  background: #1e293b;
  border: 2px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  font-size: clamp(0.85rem, 3vw, 1.05rem);
  font-weight: 900;
  border-radius: 8px;
  cursor: pointer;
  padding: 0 4px;
  white-space: nowrap;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stepper-btn:active {
  background: #38bdf8;
  color: #090d16;
  border-color: #38bdf8;
  transform: scale(0.95);
}

.duration-input-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}

.trim-confirm-card {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(168, 85, 247, 0.25));
  border: 2.5px solid #38bdf8;
  border-radius: var(--radius-sm);
  padding: 18px 16px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(6, 182, 212, 0.3);
}

.confirm-title {
  font-size: 1.1rem;
  font-weight: 900;
  color: #a5f3fc;
  margin-bottom: 8px;
}

.confirm-detail {
  font-size: 1.35rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.5;
}

.confirm-detail strong {
  color: #fde047;
  font-size: 1.6rem;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

/* ==========================================================================
   Step 5 Export Storage Hints
   ========================================================================== */
.export-storage-hint {
  margin-top: 14px;
  background: rgba(15, 23, 42, 0.75);
  border: 1.5px solid rgba(56, 189, 248, 0.35);
  border-radius: var(--radius-sm);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.export-storage-hint .hint-title {
  font-size: 0.98rem;
  font-weight: 800;
  color: #38bdf8;
  display: flex;
  align-items: center;
  gap: 6px;
}

.export-storage-hint p {
  font-size: 0.88rem;
  color: #cbd5e1;
  line-height: 1.45;
  margin: 0;
}

.export-storage-hint p strong {
  color: #fde047;
}

/* ==========================================================================
   Video Complete & Save Modal (iPhone Accessible)
   ========================================================================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
}

.modal-overlay.hidden {
  display: none !important;
}

.modal-overlay.visible {
  display: flex !important;
  opacity: 1;
  pointer-events: auto;
}

.modal-link-fallback {
  display: block;
  text-align: center;
  font-size: 0.92rem;
  color: #38bdf8;
  text-decoration: underline;
  padding: 6px;
  margin-top: 4px;
  word-break: break-all;
}

.modal-card {
  width: 100%;
  max-width: 480px;
  background: #111827;
  border: 2px solid #8b5cf6;
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(139, 92, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  0% {
    transform: scale(0.92) translateY(20px);
    opacity: 0;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.25));
  border-bottom: 1.5px solid var(--border-subtle);
}

.modal-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-sparkle-icon {
  font-size: 1.7rem;
  line-height: 1;
}

.modal-title {
  font-size: 1.2rem;
  font-weight: 900;
  color: #ffffff;
}

.modal-close-icon {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #cbd5e1;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 1.15rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.modal-close-icon:active {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.92);
}

.modal-body {
  padding: 16px 18px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-video-wrapper {
  width: 100%;
  max-width: 250px;
  height: 380px;
  max-height: 48vh;
  aspect-ratio: 9 / 16;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: #000000;
  border: 2px solid rgba(168, 85, 247, 0.5);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(168, 85, 247, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  flex-shrink: 0;
}

.modal-video-wrapper video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000000;
  display: block;
}

.modal-actions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.giant-save-photos-btn {
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  border: 2px solid #f472b6;
  color: #ffffff;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(236, 72, 153, 0.4);
  transition: transform 0.15s ease;
}

.giant-save-photos-btn:active {
  transform: scale(0.97);
}

.giant-download-file-btn {
  background: #1e293b;
  border: 2px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}

.giant-download-file-btn:active {
  background: #334155;
  transform: scale(0.97);
}

.save-guidance-card {
  background: rgba(30, 41, 59, 0.85);
  border: 1.5px solid rgba(56, 189, 248, 0.4);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}

.guidance-head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #38bdf8;
  font-size: 1.02rem;
  font-weight: 800;
}

.guidance-step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.guidance-step .step-num {
  background: #38bdf8;
  color: #090d16;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  font-weight: 900;
  flex-shrink: 0;
  margin-top: 2px;
}

.guidance-step div {
  flex: 1;
}

.guidance-step strong {
  display: block;
  font-size: 0.95rem;
  color: #f8fafc;
  margin-bottom: 2px;
}

.guidance-step p {
  font-size: 0.86rem;
  color: #cbd5e1;
  line-height: 1.45;
  margin: 0;
}

.guidance-step p strong {
  display: inline;
  color: #fde047;
}

.modal-footer {
  padding: 12px 18px 16px;
  background: #0f172a;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: center;
}

.modal-btn-sub {
  width: 100%;
  min-height: 46px;
  background: transparent;
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  border-radius: var(--radius-sm);
  color: #cbd5e1;
  font-size: 0.98rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-btn-sub:active {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  transform: scale(0.98);
}

/* Mouth Position Adjust Panel (STEP 1) */
.mouth-adjust-panel {
  margin-top: 14px;
  background: rgba(15, 23, 42, 0.85);
  border: 1.5px solid rgba(168, 85, 247, 0.35);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mouth-adjust-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.95rem;
  color: #e2e8f0;
}

.mouth-adjust-header strong {
  color: #c084fc;
  font-weight: 800;
  background: rgba(168, 85, 247, 0.15);
  padding: 2px 8px;
  border-radius: 6px;
}

.mouth-adjust-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mouth-step-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.mouth-step-btn:active {
  background: rgba(168, 85, 247, 0.4);
  transform: scale(0.95);
}

.mouth-slider {
  flex: 1;
  height: 8px;
  accent-color: #a855f7;
  cursor: pointer;
}

.mouth-test-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.mouth-test-btn {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(236, 72, 153, 0.25));
  border: 1.5px solid rgba(192, 132, 252, 0.5);
  color: #f3e8ff;
  font-size: 0.88rem;
  font-weight: 800;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.mouth-test-btn:active {
  transform: scale(0.96);
  background: rgba(168, 85, 247, 0.5);
}

.mouth-adjust-hint {
  font-size: 0.80rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.4;
}

/* ==========================================
   Official Lip-Sync Sample Card Styling
   ========================================== */
.official-sample-card {
  background: linear-gradient(145deg, rgba(30, 27, 75, 0.95), rgba(15, 23, 42, 0.95));
  border: 2px solid #a855f7;
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(168, 85, 247, 0.25);
  position: relative;
  overflow: hidden;
}

.official-sample-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 60%);
  pointer-events: none;
}

.sample-card-badge {
  display: inline-block;
  background: linear-gradient(135deg, #ec4899, #8b5cf6);
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 900;
  padding: 4px 12px;
  border-radius: 9999px;
  margin-bottom: 12px;
  box-shadow: 0 2px 10px rgba(236, 72, 153, 0.4);
}

.sample-card-body {
  display: flex;
  gap: 16px;
  align-items: center;
}

.sample-card-thumb {
  width: 90px;
  height: 120px;
  object-fit: cover;
  border-radius: 12px;
  border: 2px solid rgba(192, 132, 252, 0.6);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
}

.sample-card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sample-card-title {
  font-size: 1.05rem;
  font-weight: 900;
  color: #ffffff;
  margin: 0;
  line-height: 1.35;
}

.sample-card-desc {
  font-size: 0.82rem;
  color: #cbd5e1;
  margin: 0;
  line-height: 1.45;
}

.sample-launch-btn {
  background: linear-gradient(135deg, #d946ef, #8b5cf6) !important;
  color: #ffffff !important;
  border: 1.5px solid #f0abfc !important;
  box-shadow: 0 4px 18px rgba(217, 70, 239, 0.45) !important;
  font-size: 0.95rem !important;
  padding: 10px 16px !important;
  min-height: 46px !important;
  margin-top: 4px;
}

.sample-launch-btn:active {
  transform: scale(0.96);
}

/* Stage Header Sample Button */
.stage-sample-btn {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.8), rgba(139, 92, 246, 0.8));
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #ffffff;
  font-size: 0.80rem;
  font-weight: 800;
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  transition: all 0.15s ease;
}

.stage-sample-btn:active {
  transform: scale(0.94);
}

/* ==========================================================================
   v12.9: 単一選択（1つだけ選択状態になる）ボタン群の明確なアクティブ・非アクティブ制御
   ========================================================================== */
.models-grid-group {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.captured-frame-preview-row {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 0, 0, 0.35);
  padding: 10px 12px;
  border-radius: 10px;
  border: 1.5px solid rgba(56, 189, 248, 0.4);
}

.mat-tab-btn {
  background: rgba(15, 23, 42, 0.88) !important;
  border: 2px solid rgba(255, 255, 255, 0.18) !important;
  border-radius: 14px;
  padding: 14px 10px;
  color: #94a3b8 !important;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.35);
  -webkit-tap-highlight-color: transparent;
}

.mat-tab-btn strong {
  color: #cbd5e1 !important;
}

.mat-tab-btn small {
  color: #94a3b8 !important;
}

.mat-tab-btn:active {
  transform: scale(0.97);
}

.mat-tab-btn.active {
  background: rgba(168, 85, 247, 0.32) !important;
  border: 2.5px solid #c084fc !important;
  color: #ffffff !important;
  box-shadow: 0 0 20px rgba(192, 132, 252, 0.45);
}

.mat-tab-btn.active strong {
  color: #f0abfc !important;
}

.mat-tab-btn.active small {
  color: #f1f5f9 !important;
}

.video-pattern-btn {
  background: rgba(15, 23, 42, 0.88) !important;
  border: 2px solid rgba(255, 255, 255, 0.18) !important;
  border-radius: 14px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  color: #94a3b8 !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  -webkit-tap-highlight-color: transparent;
}

.video-pattern-btn strong {
  color: #cbd5e1 !important;
}

.video-pattern-btn:active {
  transform: scale(0.98);
}

.video-pattern-btn.active {
  background: rgba(168, 85, 247, 0.32) !important;
  border: 2.5px solid #c084fc !important;
  color: #ffffff !important;
  box-shadow: 0 0 22px rgba(168, 85, 247, 0.5);
}

.video-pattern-btn.active strong {
  color: #f0abfc !important;
}

.v11b-model-btn {
  background: rgba(15, 23, 42, 0.88) !important;
  border: 2px solid rgba(255, 255, 255, 0.16) !important;
  border-radius: 14px;
  padding: 16px;
  color: #94a3b8 !important;
  text-align: left;
  cursor: pointer;
  transition: all 0.18s ease;
  box-shadow: none;
}

.v11b-model-btn strong {
  color: #cbd5e1 !important;
}

.v11b-model-btn .v11b-model-desc {
  color: #94a3b8 !important;
}

.v11b-model-btn .v11b-model-pill {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #94a3b8 !important;
  font-weight: 700 !important;
}

.v11b-model-btn.active {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.34), rgba(236, 72, 153, 0.2)) !important;
  border: 2.5px solid #c084fc !important;
  color: #ffffff !important;
  box-shadow: 0 0 20px rgba(192, 132, 252, 0.45);
}

.v11b-model-btn.active strong {
  color: #f0abfc !important;
}

.v11b-model-btn.active .v11b-model-desc {
  color: #f8fafc !important;
}

.v11b-model-btn.active .v11b-model-pill {
  background: #10b981 !important;
  color: #052e16 !important;
  font-weight: 900 !important;
}

.video-size-btn {
  background: rgba(15, 23, 42, 0.88) !important;
  border: 2px solid rgba(255, 255, 255, 0.16) !important;
  border-radius: 14px;
  padding: 14px 10px;
  color: #94a3b8 !important;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 6px;
  transition: all 0.18s ease;
}

.video-size-btn strong {
  color: #cbd5e1 !important;
}

.video-size-btn small {
  color: #94a3b8 !important;
}

.video-size-btn .size-pill {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #94a3b8 !important;
  font-weight: 700 !important;
}

.video-size-btn.active {
  background: rgba(56, 189, 248, 0.3) !important;
  border: 2.5px solid #38bdf8 !important;
  color: #ffffff !important;
  box-shadow: 0 0 18px rgba(56, 189, 248, 0.4);
}

.video-size-btn.active strong {
  color: #7dd3fc !important;
}

.video-size-btn.active small {
  color: #f1f5f9 !important;
}

.video-size-btn.active .size-pill {
  background: #10b981 !important;
  color: #052e16 !important;
  font-weight: 900 !important;
}

.video-fit-btn,
.video-res-btn,
.vocal-sep-btn,
.identity-lock-btn,
.hybrid-stage2-btn {
  background: rgba(15, 23, 42, 0.88) !important;
  border: 1.5px solid rgba(255, 255, 255, 0.18) !important;
  border-radius: 10px;
  padding: 10px 8px;
  color: #94a3b8 !important;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
  transition: all 0.18s ease;
}

.video-fit-btn.active {
  background: rgba(168, 85, 247, 0.34) !important;
  border: 2px solid #c084fc !important;
  color: #ffffff !important;
  font-weight: 900;
  box-shadow: 0 0 14px rgba(192, 132, 252, 0.35);
}

.video-res-btn.active,
.vocal-sep-btn.active {
  background: rgba(16, 185, 129, 0.28) !important;
  border: 2px solid #10b981 !important;
  color: #ffffff !important;
  font-weight: 900;
  box-shadow: 0 0 14px rgba(16, 185, 129, 0.35);
}

.identity-lock-btn.active {
  background: rgba(217, 70, 239, 0.32) !important;
  border: 2px solid #e879f9 !important;
  color: #ffffff !important;
  font-weight: 900;
  box-shadow: 0 0 14px rgba(232, 121, 249, 0.38);
}

.hybrid-stage2-btn.active {
  background: rgba(234, 179, 8, 0.28) !important;
  border: 2px solid #facc15 !important;
  color: #ffffff !important;
  font-weight: 900;
  box-shadow: 0 0 14px rgba(250, 204, 21, 0.35);
}

.ai-style-chip {
  background: rgba(15, 23, 42, 0.88) !important;
  border: 1.5px solid rgba(255, 255, 255, 0.18) !important;
  color: #94a3b8 !important;
  border-radius: 12px;
  padding: 14px;
  font-size: 1.02rem;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  transition: all 0.18s ease;
}

.ai-style-chip.active {
  background: rgba(168, 85, 247, 0.36) !important;
  border: 2.5px solid #c084fc !important;
  color: #ffffff !important;
  font-weight: 900;
  box-shadow: 0 0 16px rgba(192, 132, 252, 0.4);
}

/* Super Zoom Support */
body.zoom-huge .mat-tab-btn strong {
  font-size: 1.25rem !important;
}

body.zoom-huge .mat-tab-btn small {
  font-size: 0.95rem !important;
}

body.zoom-huge .video-pattern-btn strong {
  font-size: 1.3rem !important;
}

body.zoom-huge .video-pattern-btn p {
  font-size: 1.08rem !important;
}

body.zoom-huge .time-counter-big {
  font-size: 2.3rem;
}

body.zoom-huge .time-counter-total {
  font-size: 1.6rem;
}

body.zoom-huge .player-status-badge {
  font-size: 0.95rem;
  padding: 5px 14px;
}

```

### 5.7 `v11-b.html`

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="0; url=index.html">
  <title>GrooveSync MV Studio - 最新版へ移動中 (v15.0)</title>
  <script>
    try {
      const target = 'index.html?v=150' + (window.location.search ? '&' + window.location.search.slice(1) : '');
      window.location.replace(target);
    } catch (e) {
      window.location.href = 'index.html?v=150';
    }
  </script>
  <style>
    body {
      background: #090d16;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      text-align: center;
      padding: 60px 20px;
    }
    .redirect-card {
      max-width: 480px;
      margin: 0 auto;
      background: rgba(30, 41, 59, 0.95);
      border: 2px solid #38bdf8;
      border-radius: 16px;
      padding: 30px 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    h1 { font-size: 1.3rem; margin-bottom: 12px; color: #38bdf8; }
    p { font-size: 1rem; color: #cbd5e1; margin-bottom: 24px; }
    a.btn {
      display: inline-block;
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      font-size: 1.1rem;
      font-weight: bold;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 12px;
      border: 2px solid #6ee7b7;
    }
  </style>
</head>
<body>
  <div class="redirect-card">
    <h1>🔄 最新版 (v15.0) へ自動移動しています</h1>
    <p>数秒待っても移動しない場合は、下のボタンをタップしてください。</p>
    <a class="btn" href="index.html?v=150">👉 最新版 (v15.0) を開く</a>
  </div>
</body>
</html>

```
