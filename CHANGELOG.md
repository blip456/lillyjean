# Changelog

## [0.5.0](https://github.com/blip456/lillyjean/compare/v0.4.3...v0.5.0) (2026-10-17)


### Features

* **challenges:** add the Challenges tab, Active, Past, the challenge page and own picks ([#44](https://github.com/blip456/lillyjean/issues/44)) ([d8c2ee4](https://github.com/blip456/lillyjean/commit/d8c2ee4608975b4718d3474acd39004cc1e1eded))
* **challenges:** add the personal challenges foundation ([#41](https://github.com/blip456/lillyjean/issues/41)) ([6d314b4](https://github.com/blip456/lillyjean/commit/6d314b43a7f0943086023045b32668e875fc4f79))
* **challenges:** create and edit challenges ([#43](https://github.com/blip456/lillyjean/issues/43)) ([2b3ad86](https://github.com/blip456/lillyjean/commit/2b3ad86c5950a9b1f99e98e22ec6c270eca3f8ad))
* **challenges:** show challenges across the app and celebrate completions ([#45](https://github.com/blip456/lillyjean/issues/45)) ([9a4ef8b](https://github.com/blip456/lillyjean/commit/9a4ef8b29fd9c51da492a7432202ac60bf471ecf))

## [0.4.3](https://github.com/blip456/lillyjean/compare/v0.4.2...v0.4.3) (2026-10-17)


### Bug Fixes

* **books:** clear the search after adding a book and close the keyboard on Search ([#39](https://github.com/blip456/lillyjean/issues/39)) ([030f2c4](https://github.com/blip456/lillyjean/commit/030f2c45afb0cd33e079b27719a758bcf296b408))
* **books:** keep the book search working while adding many books ([#38](https://github.com/blip456/lillyjean/issues/38)) ([f71a067](https://github.com/blip456/lillyjean/commit/f71a0676a9e45e6158d69aeecec59c9d7af80256))

## [0.4.2](https://github.com/blip456/lillyjean/compare/v0.4.1...v0.4.2) (2026-10-17)


### Performance

* **ui:** load each page in one round of queries and keep prefetches longer ([#36](https://github.com/blip456/lillyjean/issues/36)) ([42267b8](https://github.com/blip456/lillyjean/commit/42267b8797a89fb788aef528494493921ecefe51))

## [0.4.1](https://github.com/blip456/lillyjean/compare/v0.4.0...v0.4.1) (2026-10-15)


### Bug Fixes

* **books:** add found books to the list the search was opened from ([#32](https://github.com/blip456/lillyjean/issues/32)) ([54aff36](https://github.com/blip456/lillyjean/commit/54aff36221a8e8de49d6daa98d21198d7ff76220))
* **books:** go back to the previous screen from lists and the search ([#34](https://github.com/blip456/lillyjean/issues/34)) ([080974f](https://github.com/blip456/lillyjean/commit/080974f46d606b76c4dd082c0c54dd6fa76bdbb5))
* **ui:** behave like an app on the phone, not like a web page ([#35](https://github.com/blip456/lillyjean/issues/35)) ([5f34107](https://github.com/blip456/lillyjean/commit/5f34107c8524bfcc487067396c7cfc2d74bef17f))

## [0.4.0](https://github.com/blip456/lillyjean/compare/v0.3.1...v0.4.0) (2026-10-15)


### Features

* **books:** store book covers in Supabase Storage ([#29](https://github.com/blip456/lillyjean/issues/29)) ([4d586be](https://github.com/blip456/lillyjean/commit/4d586be9756485286e0096752053a7ebbf236c53))
* **readlists:** add books to readlists from the book menu and the book page ([#30](https://github.com/blip456/lillyjean/issues/30)) ([be1fd10](https://github.com/blip456/lillyjean/commit/be1fd10ac210c4c42fbe82f23d2c1ba31915ec3a))
* **readlists:** add the readlist screens, Readlists tab and Home row ([#31](https://github.com/blip456/lillyjean/issues/31)) ([e81c335](https://github.com/blip456/lillyjean/commit/e81c33564dd49a95ec9982d97c5c43f607a448df))
* **readlists:** add the readlists foundation and stored covers ([#27](https://github.com/blip456/lillyjean/issues/27)) ([cb772bd](https://github.com/blip456/lillyjean/commit/cb772bde63738f62410633886ab3f9e283dfadce))

## [0.3.1](https://github.com/blip456/lillyjean/compare/v0.3.0...v0.3.1) (2026-10-13)


### Bug Fixes

* **profile:** let readers clear the pledge field and type a new goal ([#24](https://github.com/blip456/lillyjean/issues/24)) ([7ed4c4d](https://github.com/blip456/lillyjean/commit/7ed4c4d5f7585d3f6765c166044b9a1e4c7174ba))

## [0.3.0](https://github.com/blip456/lillyjean/compare/v0.2.3...v0.3.0) (2026-10-12)


### Features

* **books:** add the book tracking foundation ([#16](https://github.com/blip456/lillyjean/issues/16)) ([f5ba728](https://github.com/blip456/lillyjean/commit/f5ba72853636451ebe5221c79a65125c7d795a5f))
* **books:** search books, open a book and add one manually ([#19](https://github.com/blip456/lillyjean/issues/19)) ([57e6c79](https://github.com/blip456/lillyjean/commit/57e6c7941b2c7480e39481fe4e206703f1f5425c))
* **books:** swipe to change a book's status, with undo ([#20](https://github.com/blip456/lillyjean/issues/20)) ([907e601](https://github.com/blip456/lillyjean/commit/907e6016a7d95caefa5036a8c259f2e8d7c06c1d))
* **home:** show currently reading and yearly stats, add the tab bar ([#21](https://github.com/blip456/lillyjean/issues/21)) ([a1289f6](https://github.com/blip456/lillyjean/commit/a1289f61e1938a9627465335052e3236156a1c5e))


### Bug Fixes

* **books:** link the right edition and retry dropped searches ([#18](https://github.com/blip456/lillyjean/issues/18)) ([8bcec7a](https://github.com/blip456/lillyjean/commit/8bcec7a2d1aefc53b0e969c6e192f99cb67aa66f))
* **profile:** count the books you read on the library card ([#22](https://github.com/blip456/lillyjean/issues/22)) ([59afdb0](https://github.com/blip456/lillyjean/commit/59afdb001c801180b42e162903e596bc70816b42))

## [0.2.3](https://github.com/blip456/lillyjean/compare/v0.2.2...v0.2.3) (2026-10-11)


### Performance

* **ui:** open screens instantly when tapping links ([#14](https://github.com/blip456/lillyjean/issues/14)) ([1c38e13](https://github.com/blip456/lillyjean/commit/1c38e130776e84fb5697f7ace12d972d013db331))

## [0.2.2](https://github.com/blip456/lillyjean/compare/v0.2.1...v0.2.2) (2026-10-11)


### Bug Fixes

* **ui:** add a What's coming page to settings ([#11](https://github.com/blip456/lillyjean/issues/11)) ([a24abcf](https://github.com/blip456/lillyjean/commit/a24abcf8da3d29255b135ad5c53307d77bab14d5))

## [0.2.1](https://github.com/blip456/lillyjean/compare/v0.2.0...v0.2.1) (2026-10-11)


### Bug Fixes

* **release:** release pr titles and changelog links ([#7](https://github.com/blip456/lillyjean/issues/7)) ([00b8525](https://github.com/blip456/lillyjean/commit/00b8525045ef35f7820325693f7ed4971aabc461))

## [0.2.0](https://github.com/blip456/lillyjean/compare/v0.1.0...v0.2.0) (2026-10-11)


### Features

* **auth:** accounts, onboarding, settings and feedback ([#5](https://github.com/blip456/lillyjean/issues/5)) ([c06ecfb](https://github.com/blip456/lillyjean/commit/c06ecfb3b6d18a91b5e852d223b2ea20eaf2bf98))
