# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.11.0] - 2020-10-07

### Changed

- Location states - an array (with maxStates length) instead of an object
- Loaded data is cached on client by route-location (allows data diff on loading)

### Fixed

- Doubleclick on link could throw
