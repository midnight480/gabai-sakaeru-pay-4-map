# ジオコーディングスクリプト（座標の正確化）

`scripts/update_locations.py` は、PDFから抽出した「がばいサカえーるPay」店舗データに対して、[Geocoding.jp API](https://www.geocoding.jp/api/) を用いてより正確な緯度経度を取得するためのスクリプトです。

## 注意事項

- Geocoding.jpのAPI利用制限（**10秒に1回**）を厳守するため、1店舗ごとに10.5秒の待機時間を設けています。
- 全件（約892件）の処理が完了するまでに、**約2時間半〜3時間程度**かかります。
- そのままバックグラウンドで気長に実行してください。

## 実行方法

1. Pythonの依存ライブラリをインストールします。
   ```bash
   cd /Users/tetsuya/src/gabai-sakaeru-pay-4-map
   pip3 install -r requirements.txt
   ```

2. スクリプトを実行します。
   ```bash
   python3 scripts/update_locations.py
   ```

## 中断と再開

- スクリプトは実行中、5件ごとに `docs/data/shops.json` と進行状況記録（`docs/data/geocode_progress.json`）を上書き保存します。
- **`Ctrl+C` でいつでも安全に中断**できます。
- 再度 `python3 scripts/update_locations.py` を実行すると、前回完了した続きから再開します。

## 完了後

更新された座標は、自動的に `docs/data/shops.json` に反映されます。
フロントエンド画面をリロードすると、より正確な位置にマーカーが移動していることが確認できます。
