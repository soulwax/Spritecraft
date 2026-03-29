// File: lib/src/spritesheet_packer.dart

import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:image/image.dart' as img;
import 'package:path/path.dart' as path;

import 'models/spritesheet_build_result.dart';
import 'models/spritesheet_options.dart';

class SpritesheetPacker {
  const SpritesheetPacker();

  static const Set<String> _supportedExtensions = <String>{
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.bmp',
  };

  Future<SpritesheetBuildResult> pack(SpritesheetOptions options) async {
    final String layoutMode = options.layoutMode.trim().toLowerCase();
    if (layoutMode != 'uniform-grid' && layoutMode != 'atlas') {
      throw ArgumentError(
        'Unsupported layout mode "${options.layoutMode}". Use uniform-grid or atlas.',
      );
    }

    final Directory inputDirectory = Directory(options.inputDirectory);
    if (!await inputDirectory.exists()) {
      final String resolvedPath = path.normalize(path.absolute(options.inputDirectory));
      final String currentDirectory = path.normalize(Directory.current.path);
      throw ArgumentError(
        'Input directory does not exist: ${options.inputDirectory}\n'
        'Resolved path: $resolvedPath\n'
        'Working directory: $currentDirectory\n'
        'Create the directory with source frames or pass a different --input path.',
      );
    }

    final List<FileSystemEntity> entries = await inputDirectory.list().toList();
    final List<File> files =
        entries
            .whereType<File>()
            .where(
              (File file) => _supportedExtensions.contains(
                path.extension(file.path).toLowerCase(),
              ),
            )
            .toList()
          ..sort(
            (File a, File b) =>
                path.basename(a.path).compareTo(path.basename(b.path)),
          );

    if (files.isEmpty) {
      throw StateError(
        'No supported image files were found in ${options.inputDirectory}.',
      );
    }

    final List<_LoadedFrame> frames = <_LoadedFrame>[];
    for (final File file in files) {
      final img.Image image = await _decodeImage(file);
      frames.add(
        options.trimTransparentBounds
            ? _trimFrame(file: file, image: image)
            : _LoadedFrame(
                file: file,
                image: image,
                sourceWidth: image.width,
                sourceHeight: image.height,
                trimLeft: 0,
                trimTop: 0,
              ),
      );
    }

    final int tileWidth =
        options.tileWidth ??
        frames.map((frame) => frame.image.width).reduce(math.max);
    final int tileHeight =
        options.tileHeight ??
        frames.map((frame) => frame.image.height).reduce(math.max);

    final _LayoutComputation layout = layoutMode == 'atlas'
        ? _computeAtlasLayout(
            frames: frames,
            padding: options.padding,
            forcePowerOfTwo: options.forcePowerOfTwo,
          )
        : _computeUniformGridLayout(
            frames: frames,
            tileWidth: tileWidth,
            tileHeight: tileHeight,
            columns: options.columns,
            padding: options.padding,
            forcePowerOfTwo: options.forcePowerOfTwo,
          );

    final img.Image sheet = img.Image(
      width: layout.sheetWidth,
      height: layout.sheetHeight,
    );
    img.fill(sheet, color: img.ColorRgba8(0, 0, 0, 0));

    final List<SpriteFramePlacement> placements = <SpriteFramePlacement>[];
    for (int index = 0; index < frames.length; index++) {
      final _LoadedFrame frame = frames[index];
      final _FrameLayout frameLayout = layout.frameLayouts[index];
      if (frame.image.width > frameLayout.tileWidth ||
          frame.image.height > frameLayout.tileHeight) {
        throw StateError(
          'Frame ${path.basename(frame.file.path)} exceeds the tile size '
          '(${frame.image.width}x${frame.image.height} > ${frameLayout.tileWidth}'
          'x${frameLayout.tileHeight}).',
        );
      }

      final int x = frameLayout.tileX + frameLayout.offsetX;
      final int y = frameLayout.tileY + frameLayout.offsetY;

      img.compositeImage(sheet, frame.image, dstX: x, dstY: y);

      placements.add(
        SpriteFramePlacement(
          name: path.basenameWithoutExtension(frame.file.path),
          sourcePath: path.normalize(frame.file.path),
          index: index,
          column: frameLayout.column,
          row: frameLayout.row,
          tileX: frameLayout.tileX,
          tileY: frameLayout.tileY,
          x: x,
          y: y,
          width: frame.image.width,
          height: frame.image.height,
          tileWidth: frameLayout.tileWidth,
          tileHeight: frameLayout.tileHeight,
          offsetX: frameLayout.offsetX,
          offsetY: frameLayout.offsetY,
          sourceWidth: frame.sourceWidth,
          sourceHeight: frame.sourceHeight,
          durationMs: options.frameDurationMs,
          pivotX: options.pivotX ?? ((frame.sourceWidth ~/ 2) - frame.trimLeft),
          pivotY: options.pivotY ?? ((frame.sourceHeight ~/ 2) - frame.trimTop),
          tags: _deriveFrameTags(path.basenameWithoutExtension(frame.file.path)),
        ),
      );
    }

    final String animationName = options.animationName.trim().isEmpty
        ? 'default'
        : options.animationName.trim();

    final File outputImage = File(options.outputImagePath);
    await outputImage.parent.create(recursive: true);
    await outputImage.writeAsBytes(img.encodePng(sheet));

    final SpritesheetBuildResult result = SpritesheetBuildResult(
      sheetWidth: layout.sheetWidth,
      sheetHeight: layout.sheetHeight,
      layoutMode: layoutMode,
      tileWidth: tileWidth,
      tileHeight: tileHeight,
      columns: layout.columns,
      rows: layout.rows,
      imagePath: path.normalize(options.outputImagePath),
      metadataPath: path.normalize(options.outputMetadataPath),
      frames: placements,
      animations: <SpritesheetAnimationSequence>[
        SpritesheetAnimationSequence(
          name: animationName,
          loop: true,
          frameIndices: placements
              .map((SpriteFramePlacement placement) => placement.index)
              .toList(),
          totalDurationMs: placements.fold<int>(
            0,
            (int total, SpriteFramePlacement placement) =>
                total + placement.durationMs,
          ),
        ),
      ],
    );

    final File outputMetadata = File(options.outputMetadataPath);
    await outputMetadata.parent.create(recursive: true);
    await outputMetadata.writeAsString(
      const JsonEncoder.withIndent('  ').convert(result.toJson()),
    );

    return result;
  }

  _LayoutComputation _computeUniformGridLayout({
    required List<_LoadedFrame> frames,
    required int tileWidth,
    required int tileHeight,
    required int? columns,
    required int padding,
    required bool forcePowerOfTwo,
  }) {
    final int resolvedColumns = math.max(
      1,
      columns ?? math.sqrt(frames.length).ceil(),
    );
    final int resolvedRows = (frames.length / resolvedColumns).ceil();
    final int paddedWidth =
        (resolvedColumns * tileWidth) + ((resolvedColumns - 1) * padding);
    final int paddedHeight =
        (resolvedRows * tileHeight) + ((resolvedRows - 1) * padding);

    final List<_FrameLayout> frameLayouts = <_FrameLayout>[
      for (int index = 0; index < frames.length; index++)
        _FrameLayout(
          column: index % resolvedColumns,
          row: index ~/ resolvedColumns,
          tileX: (index % resolvedColumns) * (tileWidth + padding),
          tileY: (index ~/ resolvedColumns) * (tileHeight + padding),
          tileWidth: tileWidth,
          tileHeight: tileHeight,
          offsetX: ((tileWidth - frames[index].image.width) ~/ 2),
          offsetY: ((tileHeight - frames[index].image.height) ~/ 2),
        ),
    ];

    return _LayoutComputation(
      sheetWidth: forcePowerOfTwo ? nextPowerOfTwo(paddedWidth) : paddedWidth,
      sheetHeight: forcePowerOfTwo ? nextPowerOfTwo(paddedHeight) : paddedHeight,
      columns: resolvedColumns,
      rows: resolvedRows,
      frameLayouts: frameLayouts,
    );
  }

  _LayoutComputation _computeAtlasLayout({
    required List<_LoadedFrame> frames,
    required int padding,
    required bool forcePowerOfTwo,
  }) {
    final int totalArea = frames.fold<int>(
      0,
      (int sum, _LoadedFrame frame) => sum + (frame.image.width * frame.image.height),
    );
    final int maxFrameWidth = frames
        .map((_LoadedFrame frame) => frame.image.width)
        .reduce(math.max);
    final int targetWidth = math.max(
      maxFrameWidth,
      math.sqrt(totalArea).ceil(),
    );

    int cursorX = 0;
    int cursorY = 0;
    int shelfHeight = 0;
    int usedWidth = 0;
    int row = 0;
    int column = 0;
    final List<_FrameLayout> frameLayouts = <_FrameLayout>[];

    for (final _LoadedFrame frame in frames) {
      if (cursorX > 0 && cursorX + frame.image.width > targetWidth) {
        cursorX = 0;
        cursorY += shelfHeight + padding;
        shelfHeight = 0;
        row += 1;
        column = 0;
      }

      frameLayouts.add(
        _FrameLayout(
          column: column,
          row: row,
          tileX: cursorX,
          tileY: cursorY,
          tileWidth: frame.image.width,
          tileHeight: frame.image.height,
          offsetX: 0,
          offsetY: 0,
        ),
      );

      usedWidth = math.max(usedWidth, cursorX + frame.image.width);
      shelfHeight = math.max(shelfHeight, frame.image.height);
      cursorX += frame.image.width + padding;
      column += 1;
    }

    final int usedHeight = cursorY + shelfHeight;
    return _LayoutComputation(
      sheetWidth: forcePowerOfTwo ? nextPowerOfTwo(usedWidth) : usedWidth,
      sheetHeight: forcePowerOfTwo ? nextPowerOfTwo(usedHeight) : usedHeight,
      columns: frameLayouts.isEmpty
          ? 0
          : frameLayouts.map((_FrameLayout layout) => layout.column).reduce(math.max) + 1,
      rows: frameLayouts.isEmpty ? 0 : row + 1,
      frameLayouts: frameLayouts,
    );
  }

  _LoadedFrame _trimFrame({required File file, required img.Image image}) {
    int minX = image.width;
    int minY = image.height;
    int maxX = -1;
    int maxY = -1;

    for (int y = 0; y < image.height; y++) {
      for (int x = 0; x < image.width; x++) {
        final img.Pixel pixel = image.getPixel(x, y);
        if (pixel.a > 0) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      return _LoadedFrame(
        file: file,
        image: image,
        sourceWidth: image.width,
        sourceHeight: image.height,
        trimLeft: 0,
        trimTop: 0,
      );
    }

    final img.Image trimmed = img.copyCrop(
      image,
      x: minX,
      y: minY,
      width: (maxX - minX) + 1,
      height: (maxY - minY) + 1,
    );

    return _LoadedFrame(
      file: file,
      image: trimmed,
      sourceWidth: image.width,
      sourceHeight: image.height,
      trimLeft: minX,
      trimTop: minY,
    );
  }

  List<String> _deriveFrameTags(String frameName) {
    return frameName
        .toLowerCase()
        .split(RegExp(r'[^a-z0-9]+'))
        .where((String token) => token.isNotEmpty)
        .where((String token) => int.tryParse(token) == null)
        .toSet()
        .toList();
  }

  int nextPowerOfTwo(int value) {
    if (value < 1) {
      return 1;
    }

    int power = 1;
    while (power < value) {
      power <<= 1;
    }
    return power;
  }

  Future<img.Image> _decodeImage(File file) async {
    final Uint8List bytes = await file.readAsBytes();
    final img.Image? decoded = img.decodeImage(bytes);
    if (decoded == null) {
      throw StateError('Could not decode image: ${file.path}');
    }
    return decoded;
  }
}

class _LoadedFrame {
  const _LoadedFrame({
    required this.file,
    required this.image,
    required this.sourceWidth,
    required this.sourceHeight,
    required this.trimLeft,
    required this.trimTop,
  });

  final File file;
  final img.Image image;
  final int sourceWidth;
  final int sourceHeight;
  final int trimLeft;
  final int trimTop;
}

class _FrameLayout {
  const _FrameLayout({
    required this.column,
    required this.row,
    required this.tileX,
    required this.tileY,
    required this.tileWidth,
    required this.tileHeight,
    required this.offsetX,
    required this.offsetY,
  });

  final int column;
  final int row;
  final int tileX;
  final int tileY;
  final int tileWidth;
  final int tileHeight;
  final int offsetX;
  final int offsetY;
}

class _LayoutComputation {
  const _LayoutComputation({
    required this.sheetWidth,
    required this.sheetHeight,
    required this.columns,
    required this.rows,
    required this.frameLayouts,
  });

  final int sheetWidth;
  final int sheetHeight;
  final int columns;
  final int rows;
  final List<_FrameLayout> frameLayouts;
}
