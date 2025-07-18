# minimal-island

## Astroを"再実装"する教科書

"もしAstroを自作するとしたら？"—この問いをガイドに、コンパイラ、アイランドアーキテクチャ、レンダラーの核心を、手を動かしながら再実装していく。フレームワークの内部構造を深く理解し、思考実験を骨格に据えた実践的なリバース・エンジニアリング

- コンセプト：
    - "再実装"の視点： Astroの機能を単に"使う"だけでなく、"なぜそのように作られているのか"というフレームワーク開発者の視点から深く掘り下げます。
    - 没入感のある学習体験： 各章が、仮想のフレームワークを開発していく過程として描かれ、読者がその設計・実装の思考プロセスを追体験できるような物語性を持たせます。
    - 深い技術的理解： コンパイラ、アイランドアーキテクチャ、レンダラー、Vite連携といったAstroの核心技術を、一次情報に基づいた具体的なコード例や事例を交えながら詳細に解説します。
    - 実践的なアプローチ： 各章で提示される課題や演習を通じて、読者が実際に手を動かし、知識を定着させることを重視します。
    - 高品質な文章： 箇条書きを避け、流れるような散文で、客観的かつ想像しやすい内容を目指します。

## 第１部　思想と設計の原点

### 第１章　Astroの設計思想とIslands Architecture

問い：なぜAstroは"必要なJavaScriptだけを届ける"という発想に至り、どのような設計で実現したのか

JavaScript肥大化の歴史をひもとき、SPAとSSRの進化が抱えた負債を整理する。Jason MillerによるIslands Architectureの提唱がいかに議論を活性化し、Astroが"コンテンツ中心・デフォルト高速"という哲学を選び取ったのかを、当時のコミュニティ動向と照らしながら描く。"海と島"にページを分けることで、JavaScriptをページ単位で抱える従来手法との差異を実測ベンチマークと概念図で検証し、通信量・実行時メモリ・INPの推移を数値で示す。React Server ComponentsやNuxt Islandなど近縁アプローチと並べ、設計思想の分岐と優位性を俯瞰する。

## 第２部　コア技術の深層

### 第２章　.astroファイルパーサーの実装

問い：フロントマター、HTML、JavaScript式が混在する。astroファイルをどう解析するのか

Astroの基盤となるパーサーを実装する。正規表現とステートマシンを組み合わせ、.astroファイル特有の構文を認識し、抽象構文木（AST）へと変換する。フロントマターの切り出し、HTMLとJavaScript式の境界検出、コンポーネント参照の解決など、パーサー実装の要所を押さえながら、コンパイラの第一歩を踏み出す。

**実装演習**: 章末で簡易。astroパーサーの実装（100行程度）を行い、基本的な構文解析の仕組みを体験する。

### 第３章　シンプルなHTMLビルダーの構築

問い：ASTから純粋なHTMLをどのように生成し、最初の静的ページを作り出すか

パースしたASTを走査し、HTMLを生成する最小限のビルダーを実装する。再帰的なノード処理、属性の適切な処理、テキストのエスケープ、自己完結型タグの扱いなど、HTMLジェネレーターの基礎を固める。この時点で、JavaScriptを含まない静的なHTMLページの生成が可能となり、後の章で拡張していく土台が完成する。

**実装演習**: 基本的なHTMLシリアライザーを実装し、ASTからHTMLへの変換プロセスを実践する。

### 第４章　マルチフレームワークレンダラーの統合

問い：React・Vue・Svelteを統一的に扱い、サーバーサイドでHTMLを生成するにはどうするか

各フレームワークのSSR APIの違いを吸収する統一レンダラーインターフェースを設計・実装する。ReactのrenderToString、VueのcreateSSRApp、SvelteのComponent.renderといった異なるAPIを共通の抽象化層でラップし、.astroファイル内でのシームレスなフレームワーク混在を実現する仕組みを構築する。

### 第５章　完全なビルドパイプラインの実装

問い：開発時の高速フィードバックと本番時の最適化をどう両立させるか

これまでの要素を統合し、Viteプラグインとして本格的なビルドシステムを構築する。開発サーバーでのHMR、.astroファイルの変換、仮想モジュールの生成、本番ビルドでのtree shakingとcode splittingまで、モダンなビルドツールチェーンの内部動作を実装を通じて理解する。

### 第６章　選択的ハイドレーション戦略

問い：ブラウザは<astro-island>をいつ、どのようにインタラクティブへ変貌させるのか

client:load、client:visible、client:idle、client:mediaの各戦略を実装する。IntersectionObserverによる遅延ロード、requestIdleCallbackを使った優先度制御、メディアクエリーによる条件付きハイドレーションなど、静的HTMLを選択的にインタラクティブ化する仕組みを構築し、パフォーマンスとUXの最適なバランスを探る。

**実装演習**: client:visibleの最小実装を通じて、遅延ハイドレーションの核心を理解する。

### 第７章　Content Collectionsと型安全なコンテンツ管理

問い：フロントマターの型不整合をどのように解消し、Markdownを型安全に扱うか

Zodスキーマで宣言した型をもとにビルド時検証とTypeScript型生成を行う仕組みを実装する。Markdownローダー、JSONローダーの実装から、コンテンツ間の参照整合性チェック、型定義ファイルの自動生成まで、コンテンツ駆動型サイトの開発体験を向上させるシステムを構築する。

## 第３部　実践と応用、そして未来

### 第８章　パフォーマンス計測と最適化

問い：実装したフレームワークのボトルネックをどう特定し、どの順序で改善するか

Lighthouse CIを導入し、Core Web Vitals（LCP、CLS、INP）を継続的に計測する環境を構築する。クリティカルCSSの抽出、リソースヒントの自動挿入、画像最適化、プリフェッチ戦略など、実測値に基づいた最適化を施し、その効果を数値で検証する。失敗した最適化の事例も含め、実践的な知見を共有する。

### 第９章　開発体験（DX）の向上

問い：フレームワーク利用者の生産性をどのように高めるか

エラーオーバーレイの実装、わかりやすいエラーメッセージの設計、TypeScript Language Serverとの連携、自動補完の提供など、開発者体験を向上させる機能を実装する。VSCode拡張の基礎から、デバッグ支援機能まで、フレームワークを"使いやすく"する技術を学ぶ。

### 第１０章　エコシステムと未来への拡張

問い：プラグインシステムでAstroをどこまで拡張できるか

Integration APIとBuild Hooksを実装し、サードパーティによる拡張を可能にする。CMSとの連携アダプター、デプロイメントアダプター、分析ツールの統合など、実用的なインテグレーションを構築する。最後に、View Transitions API、エッジランタイム対応、Server Componentsなど、次世代Web技術への展望を示す。

---

## 読後の成果物

最終的に読者はmonorepo形式の"re-astro"を完成させる。`pnpm dev`で`examples/blog`を立ち上げれば、Islands Architectureと型安全Content Collectionsを兼ね備えたHMR環境が動作する。各章の実装演習が積み重なり、この成果物へと結実する。

```text
astro-lite/
├─ .gitignore
├─ package.json
├─ tsconfig.base.json
├─ turbo.json
├─ astro.config.mjs
│
├─ packages/
│  ├─ core/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  └─ logger.ts
│  │  └─ package.json
│  │
│  ├─ compiler/                    # 第２章・第３章で実装
│  │  ├─ src/
│  │  │  ├─ parse.ts              # 第２章：パーサー実装
│  │  │  ├─ html-builder.ts       # 第３章：HTMLビルダー実装
│  │  │  ├─ transform.ts
│  │  │  └─ codegen.ts
│  │  └─ package.json
│  │
│  ├─ renderer-react/             # 第４章で実装
│  │  └─ src/index.ts
│  ├─ renderer-vue/               # 第４章で実装
│  │  └─ src/index.ts
│  ├─ renderer-svelte/            # 第４章で実装
│  │  └─ src/index.ts
│  │
│  ├─ vite-plugin/                # 第５章で実装
│  │  ├─ src/
│  │  │  ├─ load-astro.ts
│  │  │  ├─ hmr.ts
│  │  │  ├─ build.ts
│  │  │  └─ optimizer.ts
│  │  └─ package.json
│  │
│  ├─ runtime/                    # 第６章で実装
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ manifest.ts
│  │  │  └─ strategies/
│  │  │     ├─ load.ts
│  │  │     ├─ visible.ts
│  │  │     ├─ idle.ts
│  │  │     └─ media.ts
│  │  └─ package.json
│  │
│  ├─ content/                    # 第７章で実装
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ loaders/
│  │  │  │  ├─ md-loader.ts
│  │  │  │  └─ json-loader.ts
│  │  │  ├─ schema/
│  │  │  │  └─ zod-helpers.ts
│  │  │  ├─ generator/
│  │  │  │  ├─ manifest.ts
│  │  │  │  └─ dts-gen.ts
│  │  │  └─ runtime.ts
│  │  └─ package.json
│  │
│  └─ types/
│     ├─ astro-lite-content.d.ts
│     └─ package.json
│
└─ examples/
   ├─ blog/
   │  ├─ src/
   │  │  ├─ content/
   │  │  │  ├─ blog/welcome.md
   │  │  │  └─ authors/jp-knj.json
   │  │  ├─ pages/
   │  │  │  └─ blog/index.astro
   │  │  └─ content.config.ts
   │  ├─ astro.config.mjs
   │  └─ package.json
   └─ benchmark/
       └─ lighthouseci.config.mjs
```