# Setup Guide

## 1. 最短導入

GitHub Actions の最新成功 run を開き、artifact `ai-response-voice-queue-extension` を取得して展開します。展開後のルートに `manifest.json` があることを確認してください。

Chrome で `chrome://extensions` を開き、「デベロッパー モード」を有効化します。「パッケージ化されていない拡張機能を読み込む」を選び、展開したフォルダを指定します。

ChatGPT または Claude のページを再読み込みします。ツールバーの拡張機能アイコンから AI Response Voice Queue を固定すると、待機件数をバッジで確認できます。

## 2. 推奨設定

- 操作後の待機時間: 4.5〜8秒
- 回答間隔: 0.9〜2秒
- 最大読み上げ文字数: 1,000〜1,800文字
- 他タブ音声中は待機: 有効
- サービス名を案内: 複数AIを同時利用する場合は有効

## 3. 動作確認

1. 拡張ポップアップで自動読み上げを有効にします。
2. ChatGPT と Claude を別タブで開きます。
3. それぞれに短い質問を送ります。
4. 回答が完成するとバッジの待機件数が増えます。
5. キーボードやマウス操作を止めると、一件ずつ読み上げます。
6. YouTube 等を再生すると、そのタブが audible の間は待機します。

## 4. 読み上げない場合

- 対象タブを再読み込みする
- ポップアップで自動読み上げが有効か確認する
- 別タブが音声再生中でないか確認する
- Options の操作後待機時間を短くする
- サイトの DOM 更新後は `src/content.js` の selector を調整する

Chrome の拡張機能管理画面にエラーが出ている場合は「エラー」ボタンから service worker / content script の詳細を確認します。

## 5. 開発環境

Codespaces または devcontainer を開くと Node.js 22 と `npm ci` が自動設定されます。

```bash
npm run lint
npm test
npm run build
npm run build:web
```

`dist/` を Chrome に読み込み、`web-dist/` は任意の静的サーバーで確認します。

## 6. 本番運用に必要なもの

拡張機能自体は外部 API キーなしで動作します。GitHub Actions artifact から社内配布できます。一般公開する場合だけ Chrome Web Store Developer 登録とストア審査が必要です。

Cloudflare Pages の公開デモは GitHub 連携済みプロジェクトから自動更新します。Google Drive 側は GitHub push webhook またはリポジトリ更新処理により `repos/ai-response-voice-queue` へ完全同期されます。
