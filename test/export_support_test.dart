// File: test/export_support_test.dart

import 'dart:convert';
import 'dart:io';

import 'package:archive/archive.dart';
import 'package:path/path.dart' as path;
import 'package:spritecraft/src/server/export_support.dart';
import 'package:test/test.dart';

void main() {
  group('ExportSupport.buildBaseName', () {
    test('prefers project name and adds timestamp suffix', () {
      final String baseName = ExportSupport.buildBaseName(
        prompt: 'Forest ranger idle',
        projectName: 'Forest Ranger',
        timestamp: DateTime.utc(2026, 3, 28, 18, 41, 36),
      );

      expect(baseName, 'forest-ranger-20260328-184136');
    });

    test('falls back to prompt and sanitizes unsafe characters', () {
      final String baseName = ExportSupport.buildBaseName(
        prompt: 'Mage / Boss   Variant!!!',
        timestamp: DateTime.utc(2026, 3, 28, 9, 5, 2),
      );

      expect(baseName, 'mage-boss-variant-20260328-090502');
    });

    test('supports alternate naming styles and custom stems', () {
      final String snake = ExportSupport.buildBaseName(
        prompt: 'Unused prompt',
        customStem: 'Forest Ranger Elite',
        namingStyle: 'snake',
        timestamp: DateTime.utc(2026, 3, 28, 18, 41, 36),
      );
      final String camel = ExportSupport.buildBaseName(
        prompt: 'Unused prompt',
        customStem: 'Forest Ranger Elite',
        namingStyle: 'camel',
        timestamp: DateTime.utc(2026, 3, 28, 18, 41, 36),
      );

      expect(snake, 'forest_ranger_elite-20260328-184136');
      expect(camel, 'forestRangerElite-20260328-184136');
    });
  });

  group('ExportSupport.writeEnginePresetFiles', () {
    test('writes both engine presets when requested', () async {
      final Directory root = await Directory.systemTemp.createTemp(
        'spritecraft-export-presets-',
      );
      addTearDown(() async {
        if (await root.exists()) {
          await root.delete(recursive: true);
        }
      });

      final List<File> files = await ExportSupport.writeEnginePresetFiles(
        exportDirectory: root,
        baseName: 'forest-ranger-20260328-184136',
        enginePreset: 'both',
        metadata: <String, Object?>{
          'image': <String, Object?>{
            'path': 'build/exports/forest-ranger-20260328-184136.png',
            'width': 192,
            'height': 64,
          },
          'frames': <Map<String, Object?>>[
            <String, Object?>{
              'index': 0,
              'x': 0,
              'y': 0,
              'width': 32,
              'height': 32,
              'durationMs': 100,
            },
          ],
        },
        settings: <String, Object?>{
          'frameNamePrefix': 'sc_',
          'marginPixels': 4,
          'spacingPixels': 2,
          'pivotX': 10,
          'pivotY': 20,
        },
      );

      expect(files, hasLength(3));
      expect(
        files.map((File file) => path.basename(file.path)),
        containsAll(<String>[
          'forest-ranger-20260328-184136.godot.tres',
          'forest-ranger-20260328-184136.godot.json',
          'forest-ranger-20260328-184136.unity.json',
        ]),
      );

      final String godotResource = await files
          .firstWhere((File file) => file.path.endsWith('.godot.tres'))
          .readAsString();
      expect(godotResource, contains('[gd_resource type="SpriteFrames"'));
      expect(godotResource, contains('AtlasTexture_0'));

      final Map<String, dynamic> godotPayload =
          jsonDecode(
                await files
                    .firstWhere(
                      (File file) => file.path.endsWith('.godot.json'),
                    )
                    .readAsString(),
              )
              as Map<String, dynamic>;
      expect(godotPayload['engine'], 'godot');
      expect(godotPayload['metadata'], isA<Map<String, dynamic>>());

      final Map<String, dynamic> unityPayload =
          jsonDecode(
                await files
                    .firstWhere(
                      (File file) => file.path.endsWith('.unity.json'),
                    )
                    .readAsString(),
              )
              as Map<String, dynamic>;
      expect(unityPayload['engine'], 'unity');
      expect(unityPayload['format'], 'spritecraft.unity-importer');
      expect(unityPayload['version'], 1);
      expect(unityPayload['texture']['spriteMode'], 'Multiple');
      expect(unityPayload['sprites'], hasLength(1));
      expect(unityPayload['sprites'][0]['rect']['width'], 32);
      expect(unityPayload['sprites'][0]['name'], 'sc_frame_0');
      expect(unityPayload['sprites'][0]['pivot']['x'], closeTo(0.3125, 0.0001));
      expect(unityPayload['sprites'][0]['pivot']['y'], closeTo(0.625, 0.0001));
      expect(unityPayload['texture']['margin'], 4);
      expect(unityPayload['texture']['spacing'], 2);
      expect(unityPayload['animations'], hasLength(1));
      expect(unityPayload['animations'][0]['name'], 'default');
    });

    test('writes no preset files when preset is none', () async {
      final Directory root = await Directory.systemTemp.createTemp(
        'spritecraft-export-presets-none-',
      );
      addTearDown(() async {
        if (await root.exists()) {
          await root.delete(recursive: true);
        }
      });

      final List<File> files = await ExportSupport.writeEnginePresetFiles(
        exportDirectory: root,
        baseName: 'no-preset-export',
        enginePreset: 'none',
        metadata: const <String, Object?>{},
      );

      expect(files, isEmpty);
    });

    test(
      'writes aseprite and generic companion files when requested',
      () async {
        final Directory root = await Directory.systemTemp.createTemp(
          'spritecraft-export-presets-aseprite-generic-',
        );
        addTearDown(() async {
          if (await root.exists()) {
            await root.delete(recursive: true);
          }
        });

        final Map<String, Object?> metadata = <String, Object?>{
          'image': <String, Object?>{
            'path': 'build/exports/hero.png',
            'width': 96,
            'height': 32,
          },
          'frames': <Map<String, Object?>>[
            <String, Object?>{
              'index': 0,
              'name': 'walk_0',
              'x': 0,
              'y': 0,
              'width': 32,
              'height': 32,
              'sourceWidth': 40,
              'sourceHeight': 40,
              'offsetX': 4,
              'offsetY': 6,
              'durationMs': 80,
              'tags': <String>['walk'],
            },
            <String, Object?>{
              'index': 1,
              'name': 'walk_1',
              'x': 32,
              'y': 0,
              'width': 32,
              'height': 32,
              'durationMs': 90,
              'tags': <String>['walk'],
            },
          ],
          'animations': <Map<String, Object?>>[
            <String, Object?>{
              'name': 'walk',
              'loop': true,
              'frameIndices': <int>[0, 1],
              'totalDurationMs': 170,
            },
          ],
        };

        final List<File> asepriteFiles =
            await ExportSupport.writeEnginePresetFiles(
              exportDirectory: root,
              baseName: 'hero-export',
              enginePreset: 'aseprite',
              metadata: metadata,
              settings: <String, Object?>{
                'frameNamePrefix': 'anim_',
                'cropMode': 'trim-transparent',
              },
            );
        expect(asepriteFiles, hasLength(1));
        expect(
          path.basename(asepriteFiles.single.path),
          'hero-export.aseprite.json',
        );
        final Map<String, dynamic> asepritePayload =
            jsonDecode(await asepriteFiles.single.readAsString())
                as Map<String, dynamic>;
        expect(asepritePayload['frames']['anim_walk_0']['trimmed'], isTrue);
        expect(asepritePayload['frames']['anim_walk_0']['duration'], 80);
        expect(asepritePayload['meta']['frameTags'][0]['name'], 'walk');
        expect(
          asepritePayload['meta']['exportOptions']['cropMode'],
          'trim-transparent',
        );

        final List<File> genericFiles =
            await ExportSupport.writeEnginePresetFiles(
              exportDirectory: root,
              baseName: 'hero-export',
              enginePreset: 'generic',
              metadata: metadata,
              settings: <String, Object?>{
                'frameNamePrefix': 'anim_',
                'pivotX': 7,
                'pivotY': 9,
              },
            );
        expect(genericFiles, hasLength(1));
        expect(
          path.basename(genericFiles.single.path),
          'hero-export.generic.json',
        );
        final Map<String, dynamic> genericPayload =
            jsonDecode(await genericFiles.single.readAsString())
                as Map<String, dynamic>;
        expect(genericPayload['engine'], 'generic');
        expect(genericPayload['format'], 'spritecraft.generic-spritesheet');
        expect(genericPayload['animations'][0]['name'], 'walk');
        expect(genericPayload['frames'][0]['name'], 'anim_walk_0');
        expect(genericPayload['frames'][0]['pivotX'], 7);
        expect(genericPayload['frames'][0]['pivotY'], 9);
      },
    );

    test(
      'keeps representative animation data aligned across all export presets',
      () async {
        final Directory root = await Directory.systemTemp.createTemp(
          'spritecraft-export-presets-regression-',
        );
        addTearDown(() async {
          if (await root.exists()) {
            await root.delete(recursive: true);
          }
        });

        final Map<String, Object?> metadata = <String, Object?>{
          'image': <String, Object?>{
            'path': 'build/exports/ranger-walk.png',
            'width': 96,
            'height': 64,
          },
          'frames': <Map<String, Object?>>[
            <String, Object?>{
              'index': 0,
              'name': 'walk_0',
              'x': 0,
              'y': 0,
              'width': 32,
              'height': 32,
              'durationMs': 80,
              'pivotX': 10,
              'pivotY': 24,
              'tags': <String>['walk'],
            },
            <String, Object?>{
              'index': 1,
              'name': 'walk_1',
              'x': 32,
              'y': 0,
              'width': 32,
              'height': 32,
              'durationMs': 90,
              'pivotX': 10,
              'pivotY': 24,
              'tags': <String>['walk'],
            },
            <String, Object?>{
              'index': 2,
              'name': 'attack_0',
              'x': 64,
              'y': 0,
              'width': 32,
              'height': 32,
              'durationMs': 120,
              'pivotX': 12,
              'pivotY': 25,
              'tags': <String>['attack'],
            },
          ],
          'animations': <Map<String, Object?>>[
            <String, Object?>{
              'name': 'walk',
              'loop': true,
              'frameIndices': <int>[0, 1],
              'totalDurationMs': 170,
            },
            <String, Object?>{
              'name': 'attack',
              'loop': false,
              'frameIndices': <int>[2],
              'totalDurationMs': 120,
            },
          ],
        };

        final List<File> files = await ExportSupport.writeEnginePresetFiles(
          exportDirectory: root,
          baseName: 'ranger-export',
          enginePreset: 'all',
          metadata: metadata,
          settings: <String, Object?>{
            'frameNamePrefix': 'sc_',
            'namingStyle': 'snake',
            'marginPixels': 2,
            'spacingPixels': 1,
            'cropMode': 'trim-transparent',
          },
        );

        expect(files, hasLength(5));
        expect(
          files.map((File file) => path.basename(file.path)),
          containsAll(<String>[
            'ranger-export.godot.tres',
            'ranger-export.godot.json',
            'ranger-export.unity.json',
            'ranger-export.aseprite.json',
            'ranger-export.generic.json',
          ]),
        );

        final String godotTres = await files
            .firstWhere((File file) => file.path.endsWith('.godot.tres'))
            .readAsString();
        expect(godotTres, contains('&"walk"'));
        expect(godotTres, contains('&"attack"'));

        final Map<String, dynamic> unityPayload =
            jsonDecode(
                  await files
                      .firstWhere(
                        (File file) => file.path.endsWith('.unity.json'),
                      )
                      .readAsString(),
                )
                as Map<String, dynamic>;
        expect(unityPayload['animations'], hasLength(2));
        expect(unityPayload['animations'][0]['name'], 'walk');
        expect(unityPayload['animations'][1]['loop'], isFalse);
        expect(unityPayload['sprites'][0]['name'], 'sc_walk_0');
        expect(unityPayload['texture']['margin'], 2);
        expect(unityPayload['texture']['spacing'], 1);

        final Map<String, dynamic> asepritePayload =
            jsonDecode(
                  await files
                      .firstWhere(
                        (File file) => file.path.endsWith('.aseprite.json'),
                      )
                      .readAsString(),
                )
                as Map<String, dynamic>;
        expect(asepritePayload['frames']['sc_walk_0']['duration'], 80);
        expect(asepritePayload['frames']['sc_attack_0']['duration'], 120);
        expect(asepritePayload['meta']['frameTags'], hasLength(2));
        expect(
          asepritePayload['meta']['exportOptions']['cropMode'],
          'trim-transparent',
        );

        final Map<String, dynamic> genericPayload =
            jsonDecode(
                  await files
                      .firstWhere(
                        (File file) => file.path.endsWith('.generic.json'),
                      )
                      .readAsString(),
                )
                as Map<String, dynamic>;
        expect(genericPayload['animations'], hasLength(2));
        expect(genericPayload['frames'][2]['name'], 'sc_attack_0');
        expect(genericPayload['exportOptions']['namingStyle'], 'snake');
      },
    );
  });

  group('ExportSupport.writeExportBundle', () {
    test('creates a zip bundle with all provided files', () async {
      final Directory root = await Directory.systemTemp.createTemp(
        'spritecraft-export-bundle-',
      );
      addTearDown(() async {
        if (await root.exists()) {
          await root.delete(recursive: true);
        }
      });

      final File pngFile = File(path.join(root.path, 'hero.png'))
        ..writeAsBytesSync(<int>[1, 2, 3, 4]);
      final File jsonFile = File(path.join(root.path, 'hero.json'))
        ..writeAsStringSync('{"ok":true}');
      final File presetFile = File(path.join(root.path, 'hero.godot.json'))
        ..writeAsStringSync('{"engine":"godot"}');

      final File bundle = await ExportSupport.writeExportBundle(
        exportDirectory: root,
        baseName: 'hero-export',
        files: <File>[pngFile, jsonFile, presetFile],
      );

      expect(await bundle.exists(), isTrue);
      final List<int> zipBytes = await bundle.readAsBytes();
      final Archive archive = ZipDecoder().decodeBytes(zipBytes);
      final List<String> archivedNames = archive.files
          .map((ArchiveFile file) => file.name)
          .toList();

      expect(
        archivedNames,
        containsAll(<String>[
          'hero.png',
          'hero.json',
          'hero.godot.json',
          'bundle-manifest.json',
        ]),
      );

      final ArchiveFile manifest = archive.files.firstWhere(
        (ArchiveFile file) => file.name == 'bundle-manifest.json',
      );
      final Map<String, dynamic> manifestPayload =
          jsonDecode(utf8.decode(manifest.content as List<int>))
              as Map<String, dynamic>;
      expect(manifestPayload['bundle']['name'], 'hero-export');
      expect(
        manifestPayload['files'],
        containsAll(<String>['hero.png', 'hero.json', 'hero.godot.json']),
      );
    });
  });

  group('ExportSupport.writeCreditsArtifacts', () {
    test(
      'writes shipping-friendly credits and license companion files',
      () async {
        final Directory root = await Directory.systemTemp.createTemp(
          'spritecraft-export-credits-',
        );
        addTearDown(() async {
          if (await root.exists()) {
            await root.delete(recursive: true);
          }
        });

        final List<File> files = await ExportSupport.writeCreditsArtifacts(
          exportDirectory: root,
          baseName: 'forest-ranger-export',
          metadata: <String, Object?>{
            'image': <String, Object?>{
              'path': 'forest-ranger-export.png',
              'width': 64,
              'height': 64,
            },
            'layers': <Map<String, Object?>>[
              <String, Object?>{'itemName': 'Leather Hood'},
            ],
            'credits': <Map<String, Object?>>[
              <String, Object?>{
                'file': 'hoods/leather.png',
                'notes': 'Used in ranger variant.',
                'authors': <String>['Alice Artist'],
                'licenses': <String>['CC-BY-SA 3.0'],
                'urls': <String>['https://example.com/hood'],
              },
              <String, Object?>{
                'file': 'torso/leather.png',
                'notes': '',
                'authors': <String>['Bob Builder'],
                'licenses': <String>['OGA-BY 3.0'],
                'urls': <String>[],
              },
            ],
          },
        );

        expect(files, hasLength(3));
        expect(
          files.map((File file) => path.basename(file.path)),
          containsAll(<String>[
            'forest-ranger-export.credits.json',
            'forest-ranger-export.CREDITS.md',
            'forest-ranger-export.LICENSES.txt',
          ]),
        );

        final Map<String, dynamic> creditsJson =
            jsonDecode(
                  await files
                      .firstWhere(
                        (File file) => file.path.endsWith('.credits.json'),
                      )
                      .readAsString(),
                )
                as Map<String, dynamic>;
        expect(creditsJson['format'], 'spritecraft.credits');
        expect(
          creditsJson['licenses'],
          containsAll(<String>['CC-BY-SA 3.0', 'OGA-BY 3.0']),
        );

        final String markdown = await files
            .firstWhere((File file) => file.path.endsWith('.CREDITS.md'))
            .readAsString();
        expect(markdown, contains('# SpriteCraft Credits'));
        expect(markdown, contains('Alice Artist'));
        expect(markdown, contains('CC-BY-SA 3.0'));

        final String licensesText = await files
            .firstWhere((File file) => file.path.endsWith('.LICENSES.txt'))
            .readAsString();
        expect(licensesText, contains('SpriteCraft License Summary'));
        expect(licensesText, contains('OGA-BY 3.0'));
      },
    );
  });
}
