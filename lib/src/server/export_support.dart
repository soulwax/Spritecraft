// File: lib/src/server/export_support.dart

import 'dart:convert';
import 'dart:io';

import 'package:archive/archive.dart';
import 'package:path/path.dart' as path;

class ExportSupport {
  const ExportSupport._();

  static String buildBaseName({
    required String prompt,
    required DateTime timestamp,
    String projectName = '',
    String customStem = '',
    String namingStyle = 'kebab',
  }) {
    final String preferred = customStem.trim().isNotEmpty
        ? customStem
        : (projectName.trim().isNotEmpty ? projectName : prompt.trim());
    final String stem = sanitizeFileStem(
      preferred.isEmpty ? 'spritecraft-export' : preferred,
      namingStyle: namingStyle,
    );
    final String suffix =
        '${timestamp.year.toString().padLeft(4, '0')}'
        '${timestamp.month.toString().padLeft(2, '0')}'
        '${timestamp.day.toString().padLeft(2, '0')}-'
        '${timestamp.hour.toString().padLeft(2, '0')}'
        '${timestamp.minute.toString().padLeft(2, '0')}'
        '${timestamp.second.toString().padLeft(2, '0')}';
    return '$stem-$suffix';
  }

  static String sanitizeFileStem(
    String value, {
    String namingStyle = 'kebab',
  }) {
    final List<String> tokens = value
        .trim()
        .split(RegExp(r'[^A-Za-z0-9]+'))
        .where((String token) => token.isNotEmpty)
        .map((String token) => token.toLowerCase())
        .toList();
    if (tokens.isEmpty) {
      return 'spritecraft-export';
    }

    switch (namingStyle.trim().toLowerCase()) {
      case 'snake':
        return tokens.join('_');
      case 'camel':
        return tokens.first + tokens.skip(1).map(_capitalize).join();
      case 'pascal':
        return tokens.map(_capitalize).join();
      case 'kebab':
      default:
        return tokens.join('-');
    }
  }

  static Future<List<File>> writeEnginePresetFiles({
    required Directory exportDirectory,
    required String baseName,
    required String enginePreset,
    required Map<String, Object?> metadata,
    Map<String, Object?> settings = const <String, Object?>{},
  }) async {
    final List<File> files = <File>[];
    final String normalized = enginePreset.trim().toLowerCase();

    Future<void> addPreset(String engine) async {
      if (engine == 'godot') {
        final File tresFile = File(
          path.join(exportDirectory.path, '$baseName.godot.tres'),
        );
        await tresFile.writeAsString(
          _buildGodotSpriteFramesResource(
            baseName: baseName,
            metadata: metadata,
            settings: settings,
          ),
        );
        files.add(tresFile);

        final File compatibilityJson = File(
          path.join(exportDirectory.path, '$baseName.godot.json'),
        );
        await compatibilityJson.writeAsString(
          const JsonEncoder.withIndent('  ').convert(<String, Object?>{
            'engine': engine,
            'baseName': baseName,
            'metadata': metadata,
          }),
        );
        files.add(compatibilityJson);
        return;
      }

      if (engine == 'aseprite') {
        final File file = File(
          path.join(exportDirectory.path, '$baseName.aseprite.json'),
        );
        await file.writeAsString(
          const JsonEncoder.withIndent('  ').convert(
            _buildAsepriteMetadata(
              baseName: baseName,
              metadata: metadata,
              settings: settings,
            ),
          ),
        );
        files.add(file);
        return;
      }

      final File file = File(
        path.join(
          exportDirectory.path,
          engine == 'generic'
              ? '$baseName.generic.json'
              : '$baseName.$engine.json',
        ),
      );
      final String contents = const JsonEncoder.withIndent('  ').convert(
        engine == 'unity'
            ? _buildUnityImporterMetadata(
                baseName: baseName,
                metadata: metadata,
                settings: settings,
              )
            : engine == 'generic'
            ? _buildGenericEngineMetadata(
                baseName: baseName,
                metadata: metadata,
                settings: settings,
              )
            : <String, Object?>{
                'engine': engine,
                'baseName': baseName,
                'metadata': metadata,
              },
      );
      await file.writeAsString(contents);
      files.add(file);
    }

    if (normalized == 'godot' || normalized == 'both') {
      await addPreset('godot');
    }
    if (normalized == 'unity' || normalized == 'both') {
      await addPreset('unity');
    }
    if (normalized == 'aseprite' || normalized == 'all') {
      await addPreset('aseprite');
    }
    if (normalized == 'generic' || normalized == 'all') {
      await addPreset('generic');
    }
    if (normalized == 'all') {
      await addPreset('godot');
      await addPreset('unity');
    }

    return files;
  }

  static Future<List<File>> writeCreditsArtifacts({
    required Directory exportDirectory,
    required String baseName,
    required Map<String, Object?> metadata,
  }) async {
    final List<Map<String, Object?>> credits = _normalizedCredits(metadata);
    if (credits.isEmpty) {
      return <File>[];
    }

    final File jsonFile = File(
      path.join(exportDirectory.path, '$baseName.credits.json'),
    );
    final File markdownFile = File(
      path.join(exportDirectory.path, '$baseName.CREDITS.md'),
    );
    final File licensesFile = File(
      path.join(exportDirectory.path, '$baseName.LICENSES.txt'),
    );

    final List<String> uniqueLicenses = credits
        .expand(
          (Map<String, Object?> credit) =>
              (credit['licenses'] as List<dynamic>? ?? const <dynamic>[]),
        )
        .map((dynamic entry) => entry.toString())
        .where((String entry) => entry.trim().isNotEmpty)
        .toSet()
        .toList()
      ..sort();

    await jsonFile.writeAsString(
      const JsonEncoder.withIndent('  ').convert(<String, Object?>{
        'format': 'spritecraft.credits',
        'version': 1,
        'baseName': baseName,
        'image': metadata['image'],
        'layers': metadata['layers'],
        'credits': credits,
        'licenses': uniqueLicenses,
      }),
    );
    await markdownFile.writeAsString(
      _buildCreditsMarkdown(
        baseName: baseName,
        metadata: metadata,
        credits: credits,
        uniqueLicenses: uniqueLicenses,
      ),
    );
    await licensesFile.writeAsString(
      _buildLicensesText(
        baseName: baseName,
        uniqueLicenses: uniqueLicenses,
      ),
    );

    return <File>[jsonFile, markdownFile, licensesFile];
  }

  static Future<File> writeExportBundle({
    required Directory exportDirectory,
    required String baseName,
    required List<File> files,
  }) async {
    final Archive archive = Archive();
    final List<String> archivedNames = <String>[];
    for (final File file in files) {
      final List<int> bytes = await file.readAsBytes();
      final String fileName = path.basename(file.path);
      archive.add(
        ArchiveFile(
          fileName,
          bytes.length,
          bytes,
        ),
      );
      archivedNames.add(fileName);
    }

    final List<int> manifestBytes = utf8.encode(
      const JsonEncoder.withIndent('  ').convert(<String, Object>{
        'bundle': <String, Object>{
          'name': baseName,
          'version': 1,
        },
        'files': archivedNames,
      }),
    );
    archive.add(
      ArchiveFile(
        'bundle-manifest.json',
        manifestBytes.length,
        manifestBytes,
      ),
    );

    final List<int> zippedBytes = ZipEncoder().encode(archive);
    final File zipFile = File(path.join(exportDirectory.path, '$baseName.zip'));
    await zipFile.writeAsBytes(zippedBytes, flush: true);
    return zipFile;
  }

  static String _buildGodotSpriteFramesResource({
    required String baseName,
    required Map<String, Object?> metadata,
    Map<String, Object?> settings = const <String, Object?>{},
  }) {
    final Map<String, Object?> image =
        metadata['image'] as Map<String, Object?>? ?? <String, Object?>{};
    final String imagePath =
        path.basename(image['path']?.toString() ?? '$baseName.png');
    final int imageWidth = _asInt(image['width']) ?? 1;
    final int imageHeight = _asInt(image['height']) ?? 1;

    final List<Map<String, Object?>> frameRecords =
        _normalizedFrameRecords(metadata, imageWidth: imageWidth, imageHeight: imageHeight);
    final List<Map<String, Object?>> animations = _normalizedAnimations(
      metadata,
      frameRecords: frameRecords,
    );

    final StringBuffer buffer = StringBuffer()
      ..writeln(
        '[gd_resource type="SpriteFrames" load_steps=${frameRecords.length + 2} format=3]',
      )
      ..writeln()
      ..writeln(
        '[ext_resource type="Texture2D" path="res://$imagePath" id="1_texture"]',
      )
      ..writeln();

    for (int index = 0; index < frameRecords.length; index++) {
      final Map<String, Object?> frame = frameRecords[index];
      buffer
        ..writeln('[sub_resource type="AtlasTexture" id="AtlasTexture_$index"]')
        ..writeln('atlas = ExtResource("1_texture")')
        ..writeln(
          'region = Rect2(${_asInt(frame['x']) ?? 0}, ${_asInt(frame['y']) ?? 0}, ${_asInt(frame['width']) ?? 1}, ${_asInt(frame['height']) ?? 1})',
        )
        ..writeln();
    }

    buffer.writeln('[resource]');
    buffer.writeln('animations = [');
    for (int animationIndex = 0;
        animationIndex < animations.length;
        animationIndex++) {
      final Map<String, Object?> animation = animations[animationIndex];
      final List<int> frameIndices = (animation['frameIndices'] as List<dynamic>)
          .map((dynamic value) => _asInt(value) ?? 0)
          .toList();
      final bool loop = animation['loop'] == true;
      final int totalDurationMs = _asInt(animation['totalDurationMs']) ??
          frameIndices.fold<int>(
            0,
            (int total, int frameIndex) =>
                total + (_asInt(frameRecords[frameIndex]['durationMs']) ?? 100),
          );
      final double speed = frameIndices.isEmpty
          ? 1.0
          : (1000 / (totalDurationMs / frameIndices.length)).clamp(0.01, 9999.0);

      buffer
        ..writeln('  {')
        ..writeln('    "frames": [');
      for (int i = 0; i < frameIndices.length; i++) {
        final int frameIndex = frameIndices[i];
        final Map<String, Object?> frame = frameRecords[frameIndex];
        final double durationSeconds =
            (_asInt(frame['durationMs']) ?? 100) / 1000.0;
        buffer.writeln(
          '      {"duration": ${durationSeconds.toStringAsFixed(3)}, "texture": SubResource("AtlasTexture_$frameIndex")}${i == frameIndices.length - 1 ? '' : ','}',
        );
      }
      buffer
        ..writeln('    ],')
        ..writeln('    "loop": ${loop ? 'true' : 'false'},')
        ..writeln('    "name": &"${animation['name']}",')
        ..writeln('    "speed": ${speed.toStringAsFixed(3)}')
        ..writeln('  }${animationIndex == animations.length - 1 ? '' : ','}');
    }
    buffer.writeln(']');
    return buffer.toString();
  }

  static Map<String, Object?> _buildUnityImporterMetadata({
    required String baseName,
    required Map<String, Object?> metadata,
    Map<String, Object?> settings = const <String, Object?>{},
  }) {
    final Map<String, Object?> image =
        metadata['image'] as Map<String, Object?>? ?? <String, Object?>{};
    final String imagePath =
        path.basename(image['path']?.toString() ?? '$baseName.png');
    final int imageWidth = _asInt(image['width']) ?? 1;
    final int imageHeight = _asInt(image['height']) ?? 1;

    final List<Map<String, Object?>> frameRecords = _normalizedFrameRecords(
      metadata,
      imageWidth: imageWidth,
      imageHeight: imageHeight,
    );
    final List<Map<String, Object?>> animations = _normalizedAnimations(
      metadata,
      frameRecords: frameRecords,
    );

    final int marginPixels = _asInt(settings['marginPixels']) ?? 0;
    final int spacingPixels = _asInt(settings['spacingPixels']) ?? 0;
    final int? pivotXOverride = _asInt(settings['pivotX']);
    final int? pivotYOverride = _asInt(settings['pivotY']);

    final List<Map<String, Object?>> sprites = frameRecords.map((
      Map<String, Object?> frame,
    ) {
      final int width = (_asInt(frame['width']) ?? 1).clamp(1, 1 << 20);
      final int height = (_asInt(frame['height']) ?? 1).clamp(1, 1 << 20);
      final int pivotX = pivotXOverride ?? _asInt(frame['pivotX']) ?? width ~/ 2;
      final int pivotY = pivotYOverride ?? _asInt(frame['pivotY']) ?? height ~/ 2;
      return <String, Object?>{
        'name': _frameExportName(frame, settings: settings),
        'rect': <String, Object?>{
          'x': _asInt(frame['x']) ?? 0,
          'y': _asInt(frame['y']) ?? 0,
          'width': width,
          'height': height,
        },
        'pivot': <String, double>{
          'x': width == 0 ? 0.5 : pivotX / width,
          'y': height == 0 ? 0.5 : pivotY / height,
        },
        'alignment': 'custom',
        'border': <int>[0, 0, 0, 0],
        'frameIndex': _asInt(frame['index']) ?? 0,
        'durationMs': _asInt(frame['durationMs']) ?? 100,
        'tags': (frame['tags'] as List<dynamic>? ?? const <dynamic>[])
            .map((dynamic value) => value.toString())
            .toList(),
        'sourceSize': <String, Object?>{
          'width': _asInt(frame['sourceWidth']) ?? width,
          'height': _asInt(frame['sourceHeight']) ?? height,
        },
      };
    }).toList();

    final List<Map<String, Object?>> clips = animations.map((
      Map<String, Object?> animation,
    ) {
      final List<int> frameIndices = (animation['frameIndices'] as List<dynamic>)
          .map((dynamic value) => _asInt(value) ?? 0)
          .toList();
      final List<Map<String, Object?>> frames = frameIndices.map((int frameIndex) {
        final Map<String, Object?> frame = frameRecords[frameIndex];
        return <String, Object?>{
          'frameIndex': frameIndex,
          'spriteName': _frameExportName(frame, settings: settings),
          'durationMs': _asInt(frame['durationMs']) ?? 100,
        };
      }).toList();
      final int totalDurationMs = _asInt(animation['totalDurationMs']) ??
          frames.fold<int>(
            0,
            (int total, Map<String, Object?> frame) =>
                total + (_asInt(frame['durationMs']) ?? 100),
          );
      final double samplesPerSecond = frameIndices.isEmpty
          ? 12
          : (1000 / (totalDurationMs / frameIndices.length)).clamp(1.0, 120.0);
      return <String, Object?>{
        'name': animation['name']?.toString() ?? 'default',
        'loop': animation['loop'] == true,
        'samplesPerSecond': samplesPerSecond,
        'frames': frames,
      };
    }).toList();

    return <String, Object?>{
      'engine': 'unity',
      'format': 'spritecraft.unity-importer',
      'version': 1,
      'baseName': baseName,
      'texture': <String, Object?>{
        'path': imagePath,
        'width': imageWidth,
        'height': imageHeight,
        'type': 'Sprite',
        'spriteMode': 'Multiple',
        'meshType': 'FullRect',
        'pixelsPerUnit': 100,
        'generatePhysicsShape': false,
        'margin': marginPixels,
        'spacing': spacingPixels,
      },
      'sprites': sprites,
      'animations': clips,
      'exportOptions': _normalizedSettings(settings),
      'metadata': metadata,
    };
  }

  static Map<String, Object?> _buildAsepriteMetadata({
    required String baseName,
    required Map<String, Object?> metadata,
    Map<String, Object?> settings = const <String, Object?>{},
  }) {
    final Map<String, Object?> image =
        metadata['image'] as Map<String, Object?>? ?? <String, Object?>{};
    final String imagePath =
        path.basename(image['path']?.toString() ?? '$baseName.png');
    final int imageWidth = _asInt(image['width']) ?? 1;
    final int imageHeight = _asInt(image['height']) ?? 1;
    final List<Map<String, Object?>> frameRecords = _normalizedFrameRecords(
      metadata,
      imageWidth: imageWidth,
      imageHeight: imageHeight,
    );
    final List<Map<String, Object?>> animations = _normalizedAnimations(
      metadata,
      frameRecords: frameRecords,
    );

    final Map<String, Object?> frames = <String, Object?>{};
    for (final Map<String, Object?> frame in frameRecords) {
      final String name = _frameExportName(frame, settings: settings);
      final int width = _asInt(frame['width']) ?? imageWidth;
      final int height = _asInt(frame['height']) ?? imageHeight;
      final int sourceWidth = _asInt(frame['sourceWidth']) ?? width;
      final int sourceHeight = _asInt(frame['sourceHeight']) ?? height;
      final int offsetX = _asInt(frame['offsetX']) ?? 0;
      final int offsetY = _asInt(frame['offsetY']) ?? 0;
      frames[name] = <String, Object?>{
        'frame': <String, Object?>{
          'x': _asInt(frame['x']) ?? 0,
          'y': _asInt(frame['y']) ?? 0,
          'w': width,
          'h': height,
        },
        'rotated': false,
        'trimmed':
            sourceWidth != width || sourceHeight != height || offsetX != 0 || offsetY != 0,
        'spriteSourceSize': <String, Object?>{
          'x': offsetX,
          'y': offsetY,
          'w': width,
          'h': height,
        },
        'sourceSize': <String, Object?>{
          'w': sourceWidth,
          'h': sourceHeight,
        },
        'duration': _asInt(frame['durationMs']) ?? 100,
      };
    }

    final List<Map<String, Object?>> frameTags = animations.map((
      Map<String, Object?> animation,
    ) {
      final List<int> frameIndices = (animation['frameIndices'] as List<dynamic>)
          .map((dynamic value) => _asInt(value) ?? 0)
          .toList();
      return <String, Object?>{
        'name': animation['name']?.toString() ?? 'default',
        'from': frameIndices.isEmpty ? 0 : frameIndices.first,
        'to': frameIndices.isEmpty ? 0 : frameIndices.last,
        'direction': animation['loop'] == true ? 'forward' : 'once',
      };
    }).toList();

    return <String, Object?>{
      'frames': frames,
      'meta': <String, Object?>{
        'app': 'SpriteCraft',
        'version': 1,
        'image': imagePath,
        'format': 'RGBA8888',
        'size': <String, Object?>{
          'w': imageWidth,
          'h': imageHeight,
        },
        'scale': '1',
        'frameTags': frameTags,
        'exportOptions': _normalizedSettings(settings),
      },
    };
  }

  static Map<String, Object?> _buildGenericEngineMetadata({
    required String baseName,
    required Map<String, Object?> metadata,
    Map<String, Object?> settings = const <String, Object?>{},
  }) {
    final Map<String, Object?> image =
        metadata['image'] as Map<String, Object?>? ?? <String, Object?>{};
    final String imagePath =
        path.basename(image['path']?.toString() ?? '$baseName.png');
    final int imageWidth = _asInt(image['width']) ?? 1;
    final int imageHeight = _asInt(image['height']) ?? 1;
    final List<Map<String, Object?>> frameRecords = _normalizedFrameRecords(
      metadata,
      imageWidth: imageWidth,
      imageHeight: imageHeight,
    );
    final List<Map<String, Object?>> animations = _normalizedAnimations(
      metadata,
      frameRecords: frameRecords,
    );

    return <String, Object?>{
      'engine': 'generic',
      'format': 'spritecraft.generic-spritesheet',
      'version': 1,
      'texture': <String, Object?>{
        'path': imagePath,
        'width': imageWidth,
        'height': imageHeight,
      },
      'frames': frameRecords
          .map(
            (Map<String, Object?> frame) => <String, Object?>{
              ...frame,
              'name': _frameExportName(frame, settings: settings),
              if (_asInt(settings['pivotX']) != null)
                'pivotX': _asInt(settings['pivotX']),
              if (_asInt(settings['pivotY']) != null)
                'pivotY': _asInt(settings['pivotY']),
            },
          )
          .toList(),
      'animations': animations,
      'exportOptions': _normalizedSettings(settings),
      'metadata': metadata,
    };
  }

  static String _frameExportName(
    Map<String, Object?> frame, {
    required Map<String, Object?> settings,
  }) {
    final String prefix = settings['frameNamePrefix']?.toString().trim() ?? '';
    final String fallbackName =
        frame['name']?.toString() ?? 'frame_${frame['index'] ?? 0}';
    return prefix.isEmpty ? fallbackName : '$prefix$fallbackName';
  }

  static Map<String, Object?> _normalizedSettings(Map<String, Object?> settings) {
    return <String, Object?>{
      'namingStyle': settings['namingStyle']?.toString() ?? 'kebab',
      'customStem': settings['customStem']?.toString() ?? '',
      'frameNamePrefix': settings['frameNamePrefix']?.toString() ?? '',
      'marginPixels': _asInt(settings['marginPixels']) ?? 0,
      'spacingPixels': _asInt(settings['spacingPixels']) ?? 0,
      'cropMode': settings['cropMode']?.toString() ?? 'none',
      'pivotX': _asInt(settings['pivotX']),
      'pivotY': _asInt(settings['pivotY']),
    };
  }

  static List<Map<String, Object?>> _normalizedFrameRecords(
    Map<String, Object?> metadata, {
    required int imageWidth,
    required int imageHeight,
  }) {
    final List<dynamic>? frames = metadata['frames'] as List<dynamic>?;
    if (frames != null && frames.isNotEmpty) {
      return frames
          .whereType<Map>()
          .map(
            (Map<dynamic, dynamic> frame) => Map<String, Object?>.from(frame),
          )
          .toList();
    }

    return <Map<String, Object?>>[
      <String, Object?>{
        'index': 0,
        'name': 'frame_0',
        'x': 0,
        'y': 0,
        'width': imageWidth,
        'height': imageHeight,
        'durationMs': 100,
        'pivotX': imageWidth ~/ 2,
        'pivotY': imageHeight ~/ 2,
        'tags': <String>['default'],
      },
    ];
  }

  static List<Map<String, Object?>> _normalizedAnimations(
    Map<String, Object?> metadata, {
    required List<Map<String, Object?>> frameRecords,
  }) {
    final List<dynamic>? animations = metadata['animations'] as List<dynamic>?;
    if (animations != null && animations.isNotEmpty) {
      return animations
          .whereType<Map>()
          .map(
            (Map<dynamic, dynamic> animation) =>
                Map<String, Object?>.from(animation),
          )
          .toList();
    }

    return <Map<String, Object?>>[
      <String, Object?>{
        'name': 'default',
        'loop': true,
        'frameIndices': frameRecords
            .map((Map<String, Object?> frame) => _asInt(frame['index']) ?? 0)
            .toList(),
        'totalDurationMs': frameRecords.fold<int>(
          0,
          (int total, Map<String, Object?> frame) =>
              total + (_asInt(frame['durationMs']) ?? 100),
        ),
      },
    ];
  }

  static int? _asInt(Object? value) {
    if (value is int) {
      return value;
    }
    return int.tryParse(value?.toString() ?? '');
  }

  static String _capitalize(String value) {
    if (value.isEmpty) {
      return value;
    }
    return value[0].toUpperCase() + value.substring(1);
  }

  static List<Map<String, Object?>> _normalizedCredits(
    Map<String, Object?> metadata,
  ) {
    final List<dynamic>? credits = metadata['credits'] as List<dynamic>?;
    if (credits == null || credits.isEmpty) {
      return <Map<String, Object?>>[];
    }
    return credits
        .whereType<Map>()
        .map(
          (Map<dynamic, dynamic> credit) => Map<String, Object?>.from(credit),
        )
        .toList();
  }

  static String _buildCreditsMarkdown({
    required String baseName,
    required Map<String, Object?> metadata,
    required List<Map<String, Object?>> credits,
    required List<String> uniqueLicenses,
  }) {
    final StringBuffer buffer = StringBuffer()
      ..writeln('# SpriteCraft Credits')
      ..writeln()
      ..writeln('Export: `$baseName`')
      ..writeln();

    final Map<String, Object?>? image = metadata['image'] as Map<String, Object?>?;
    if (image != null) {
      buffer
        ..writeln('## Image')
        ..writeln()
        ..writeln('- Path: `${image['path']}`')
        ..writeln('- Size: `${image['width']} x ${image['height']}`')
        ..writeln();
    }

    buffer
      ..writeln('## Credit Entries')
      ..writeln();
    for (final Map<String, Object?> credit in credits) {
      final List<String> authors = (credit['authors'] as List<dynamic>? ?? const <dynamic>[])
          .map((dynamic entry) => entry.toString())
          .toList();
      final List<String> licenses =
          (credit['licenses'] as List<dynamic>? ?? const <dynamic>[])
              .map((dynamic entry) => entry.toString())
              .toList();
      final List<String> urls = (credit['urls'] as List<dynamic>? ?? const <dynamic>[])
          .map((dynamic entry) => entry.toString())
          .toList();

      buffer
        ..writeln('### ${credit['file']}')
        ..writeln()
        ..writeln('- Authors: ${authors.isEmpty ? 'Unknown' : authors.join(', ')}')
        ..writeln(
          '- Licenses: ${licenses.isEmpty ? 'Unspecified' : licenses.join(', ')}',
        );
      if ((credit['notes']?.toString().trim().isNotEmpty ?? false)) {
        buffer.writeln('- Notes: ${credit['notes']}');
      }
      if (urls.isNotEmpty) {
        buffer.writeln('- URLs: ${urls.join(', ')}');
      }
      buffer.writeln();
    }

    buffer
      ..writeln('## License Summary')
      ..writeln()
      ..writeln(
        uniqueLicenses.isEmpty
            ? '- No explicit licenses were found in the credit metadata.'
            : uniqueLicenses.map((String entry) => '- $entry').join('\n'),
      )
      ..writeln();

    return buffer.toString();
  }

  static String _buildLicensesText({
    required String baseName,
    required List<String> uniqueLicenses,
  }) {
    final StringBuffer buffer = StringBuffer()
      ..writeln('SpriteCraft License Summary')
      ..writeln('Export: $baseName')
      ..writeln();

    if (uniqueLicenses.isEmpty) {
      buffer.writeln('No explicit licenses were found in the export credit metadata.');
      return buffer.toString();
    }

    for (final String license in uniqueLicenses) {
      buffer.writeln('- $license');
    }
    return buffer.toString();
  }
}
