# Changelog






## Release (2025-01-13)

ember-sortable 5.2.3 (patch)

#### :bug: Bug Fix
* `ember-sortable`
  * [#606](https://github.com/adopted-ember-addons/ember-sortable/pull/606) bug: Support when border-spacing returns a single value ([@cyril-sf](https://github.com/cyril-sf))

#### Committers: 1
- Cyril Fluck ([@cyril-sf](https://github.com/cyril-sf))

## Release (2024-10-03)

ember-sortable 5.2.2 (patch)

#### :bug: Bug Fix
* `ember-sortable`
  * [#591](https://github.com/adopted-ember-addons/ember-sortable/pull/591) Fix direction x (calculation incorrect) ([@mkszepp](https://github.com/mkszepp))
  * [#587](https://github.com/adopted-ember-addons/ember-sortable/pull/587) fix types for reorder and drag test helpers ([@BoussonKarel](https://github.com/BoussonKarel))

#### Committers: 2
- Markus Sanin ([@mkszepp](https://github.com/mkszepp))
- [@BoussonKarel](https://github.com/BoussonKarel)

## Release (2024-09-25)

ember-sortable 5.2.1 (patch)

#### :bug: Bug Fix
* `ember-sortable`
  * [#585](https://github.com/adopted-ember-addons/ember-sortable/pull/585) Add missing declaration export for modifier, services & test-support ([@mkszepp](https://github.com/mkszepp))

#### Committers: 1
- Markus Sanin ([@mkszepp](https://github.com/mkszepp))

## Release (2024-09-21)

ember-sortable 5.2.0 (minor)

#### :rocket: Enhancement
* `ember-sortable`, `test-app`
  * [#581](https://github.com/adopted-ember-addons/ember-sortable/pull/581) Convert addon to TypeScript & add glint ([@mkszepp](https://github.com/mkszepp))

#### :house: Internal
* `ember-sortable`, `docs`, `test-app`
  * [#582](https://github.com/adopted-ember-addons/ember-sortable/pull/582) Update dependencies & bring back green CI ([@mkszepp](https://github.com/mkszepp))

#### Committers: 1
- Markus Sanin ([@mkszepp](https://github.com/mkszepp))

## Release (2024-08-03)

ember-sortable 5.1.2 (patch)

#### :bug: Bug Fix
* `ember-sortable`, `test-app`
  * [#575](https://github.com/adopted-ember-addons/ember-sortable/pull/575) Fix error `TypeError: items[0] is undefined` in `sortable-item` modifier ([@mkszepp](https://github.com/mkszepp))

#### :memo: Documentation
* [#572](https://github.com/adopted-ember-addons/ember-sortable/pull/572) Add info about `grid` direction into readme and minimal fixes ([@mkszepp](https://github.com/mkszepp))

#### :house: Internal
* `ember-sortable`
  * [#571](https://github.com/adopted-ember-addons/ember-sortable/pull/571) fix demo links and turn of github pages deploy ([@mansona](https://github.com/mansona))

#### Committers: 2
- Chris Manson ([@mansona](https://github.com/mansona))
- Markus Sanin ([@mkszepp](https://github.com/mkszepp))

## Release (2024-07-12)

ember-sortable 5.1.1 (patch)

#### :bug: Bug Fix
* `ember-sortable`, `test-app`
  * [#566](https://github.com/adopted-ember-addons/ember-sortable/pull/566) Fix grid direction, when group element has negative margin ([@mkszepp](https://github.com/mkszepp))

#### Committers: 1
- Markus Sanin ([@mkszepp](https://github.com/mkszepp))

## Release (2024-07-06)

ember-sortable 5.1.0 (minor)

#### :rocket: Enhancement
* `ember-sortable`, `docs`, `test-app`
  * [#560](https://github.com/adopted-ember-addons/ember-sortable/pull/560) Add direction grid ([@mkszepp](https://github.com/mkszepp))

#### :bug: Bug Fix
* `ember-sortable`
  * [#562](https://github.com/adopted-ember-addons/ember-sortable/pull/562) Fix: Block drag start while any item is busy & add wait for transition end in test helper `drop` ([@mkszepp](https://github.com/mkszepp))

#### Committers: 1
- Markus Sanin ([@mkszepp](https://github.com/mkszepp))

## Release (2024-06-04)

ember-sortable 5.0.2 (patch)

#### :bug: Bug Fix
* `ember-sortable`
  * [#558](https://github.com/adopted-ember-addons/ember-sortable/pull/558) Add missing extensions to exports ([@deanylev](https://github.com/deanylev))

#### Committers: 1
- Dean Levinson ([@deanylev](https://github.com/deanylev))
## Release (2023-12-20)

ember-sortable 5.0.1 (patch)

#### :rocket: Enhancement
* `test-app`
  * [#524](https://github.com/adopted-ember-addons/ember-sortable/pull/524) Test against LTS 4.12 and 5.4 ([@NullVoxPopuli](https://github.com/NullVoxPopuli))

#### :bug: Bug Fix
* `ember-sortable`
  * [#521](https://github.com/adopted-ember-addons/ember-sortable/pull/521) importing from the _app_ directory was disallowed because of the exports config. ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#523](https://github.com/adopted-ember-addons/ember-sortable/pull/523) widen peer ranges ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
  * [#506](https://github.com/adopted-ember-addons/ember-sortable/pull/506) when sortable is disabled, scrolling is blocked on ios ([@st-h](https://github.com/st-h))
* `ember-sortable`, `test-app`
  * [#518](https://github.com/adopted-ember-addons/ember-sortable/pull/518) Allow @ember/test-helpers 3 ([@francois2metz](https://github.com/francois2metz))

#### :house: Internal
* Other
  * [#533](https://github.com/adopted-ember-addons/ember-sortable/pull/533) Simplify CI ([@NullVoxPopuli](https://github.com/NullVoxPopuli))
* `ember-sortable`
  * [#522](https://github.com/adopted-ember-addons/ember-sortable/pull/522) Setup release-plan ([@NullVoxPopuli](https://github.com/NullVoxPopuli))

#### Committers: 3
- François de Metz ([@francois2metz](https://github.com/francois2metz))
- Steve ([@st-h](https://github.com/st-h))
- [@NullVoxPopuli](https://github.com/NullVoxPopuli)
