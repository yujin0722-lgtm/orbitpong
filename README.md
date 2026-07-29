# Orbit Pong

円形フィールドでCPUと対戦する、スマートフォン／PC対応のミニマムなPongゲームです。

公開版：<https://orbitpong.su-udon.com>

## ゲーム内容

- プレイヤーは円周の下半分、CPUは上半分を移動
- マウス、タッチ、左右キーで操作
- 先に5点取ると勝利
- 返球ごとにボールとバーが加速
- 長いラリーでは画面が緑から黄色、赤へ変化
- バーを動かしながら当てると打球方向へ強く影響
- CPU難易度はEASY／NORMAL／HARD
- 得点後は画面をクリックして次のサーブを開始

## 技術構成

- TypeScript
- React 19
- Next.js App Router
- Vinext / Vite
- Canvas 2D
- Cloudflare Worker互換出力

ゲームの主要処理は `app/page.tsx`、画面デザインは
`app/globals.css` にまとまっています。

## ローカルで動かす

Node.js 22.13以上が必要です。

```bash
npm install
npm run dev
```

開発サーバーが表示したURLをブラウザで開いてください。

## ビルド

```bash
npm run build
```

このソースはChatGPT Sites用のVinext構成です。通常のGitHubリポジトリとして
保存・共同編集できますが、GitHub Pagesへ直接公開する静的HTML構成ではありません。
GitHub Pagesへ公開する場合は、静的書き出しに対応させるか、ゲーム部分を
Vite ReactまたはHTML／CSS／JavaScriptへ移植してください。

## GitHubへ登録する

ZIPを展開し、展開先で次を実行します。

```bash
git init
git add .
git commit -m "Initial Orbit Pong release"
git branch -M main
git remote add origin <作成したGitHubリポジトリのURL>
git push -u origin main
```

GitHubのWeb画面からアップロードする場合は、展開後のファイルとフォルダーを
すべてリポジトリへアップロードしてください。

## AIへ修正を依頼する場合

同梱の `ORBIT_PONG_AI_HANDOFF.md` を最初に読ませてください。

## ライセンス

ライセンスはまだ指定していません。公開リポジトリで第三者による再利用を
許可する場合は、MIT Licenseなどを別途選択してください。
