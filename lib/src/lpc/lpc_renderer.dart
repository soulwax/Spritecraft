// File: lib/src/lpc/lpc_renderer.dart

import 'dart:convert';
import 'dart:collection';
import 'dart:io';
import 'dart:typed_data';

import 'package:image/image.dart' as img;
import 'package:path/path.dart' as path;

import '../models/lpc_models.dart';

class LpcRenderer {
  LpcRenderer({
    required this.catalog,
    required this.spritesheetsDirectory,
    this.decodedAssetCacheDirectory,
    this.maxDecodedAssetCacheEntries = 256,
    this.maxResolvedPathCacheEntries = 512,
  });

  final LpcCatalog catalog;
  final Directory spritesheetsDirectory;
  final Directory? decodedAssetCacheDirectory;
  final int maxDecodedAssetCacheEntries;
  final int maxResolvedPathCacheEntries;
  final LinkedHashMap<String, img.Image> _decodedAssetCache =
      LinkedHashMap<String, img.Image>();
  final LinkedHashMap<String, String?> _resolvedAssetPathCache =
      LinkedHashMap<String, String?>();

  Future<LpcRenderResult> render(LpcRenderRequest request) async {
    if (!await spritesheetsDirectory.exists()) {
      throw StateError(
        'LPC spritesheets were not found at ${spritesheetsDirectory.path}.',
      );
    }

    final String bodyColorVariant = _resolveBodyColorVariant(request);
    final List<_ResolvedLayer> layers = <_ResolvedLayer>[];
    final List<String> missingAssetHints = <String>[];

    for (final MapEntry<String, String> entry in request.selections.entries) {
      final LpcItemDefinition? item = catalog.itemsById[entry.key];
      if (item == null) {
        continue;
      }

      final String selectedVariant = item.matchBodyColor
          ? bodyColorVariant
          : entry.value;

      for (final LpcLayerDefinition layer in item.layers) {
        final String? basePath = layer.bodyTypePaths[request.bodyType];
        if (basePath == null || basePath.contains(r'${')) {
          missingAssetHints.add(
            '${item.id}:${layer.id} has no usable asset path for body type ${request.bodyType}.',
          );
          continue;
        }

        final String expectedRelativePath = path.posix.normalize(
          path.posix.join(basePath, request.animation, '$selectedVariant.png'),
        );
        final String? relativeAssetPath = await _resolveAssetPath(
          basePath: basePath,
          animation: request.animation,
          variant: selectedVariant,
        );
        if (relativeAssetPath == null) {
          missingAssetHints.add(
            '${item.id}:${layer.id} could not resolve an asset for ${request.bodyType}/${request.animation}/$selectedVariant. Expected near $expectedRelativePath.',
          );
          continue;
        }

        final File file = File(
          path.join(spritesheetsDirectory.path, relativeAssetPath),
        );
        final img.Image? decoded = await _loadDecodedImage(file);
        final img.Image? image = decoded == null
            ? null
            : _applyRecolorIfNeeded(
                decoded,
                recolorHex: request.recolorGroups[_inferRecolorGroup(item)],
              );
        if (image == null) {
          continue;
        }

        layers.add(
          _ResolvedLayer(
            image: image,
            usedLayer: UsedLpcLayer(
              itemId: item.id,
              itemName: item.name,
              typeName: item.typeName,
              variant: selectedVariant,
              layerId: layer.id,
              zPos: layer.zPos,
              assetPath: path.posix.normalize(relativeAssetPath),
            ),
            credits: _creditsForAsset(
              item,
              path.posix.normalize(relativeAssetPath),
            ),
          ),
        );
      }
    }

    for (final ExternalRenderLayer externalLayer in request.externalLayers) {
      if (externalLayer.path.trim().isEmpty) {
        continue;
      }

      final File file = _resolveExternalLayerFile(externalLayer.path);
      if (!await file.exists()) {
        throw StateError('External layer was not found at ${file.path}.');
      }

      final img.Image? image = await _loadDecodedImage(file);
      if (image == null) {
        throw StateError(
          'External layer at ${file.path} could not be decoded as an image.',
        );
      }

      final String normalizedPath = path.normalize(file.path);
      layers.add(
        _ResolvedLayer(
          image: image,
          usedLayer: UsedLpcLayer(
            itemId: 'external:$normalizedPath',
            itemName: externalLayer.name.trim().isEmpty
                ? path.basenameWithoutExtension(file.path)
                : externalLayer.name,
            typeName: 'external-overlay',
            variant: 'custom',
            layerId: 'external',
            zPos: externalLayer.zPos,
            assetPath: normalizedPath,
          ),
          credits: <LpcCreditRecord>[
            LpcCreditRecord(
              file: normalizedPath,
              notes: 'User-provided external overlay layer.',
              authors: const <String>[],
              licenses: const <String>[],
              urls: const <String>[],
            ),
          ],
        ),
      );
    }

    if (layers.isEmpty) {
      final String detail = missingAssetHints.isEmpty
          ? ''
          : ' Missing asset hints: ${missingAssetHints.take(3).join(' ')}';
      throw StateError(
        'No renderable layers were found for ${request.bodyType} / ${request.animation}.$detail',
      );
    }

    layers.sort((_ResolvedLayer a, _ResolvedLayer b) {
      final int zCompare = a.usedLayer.zPos.compareTo(b.usedLayer.zPos);
      if (zCompare != 0) {
        return zCompare;
      }
      return a.usedLayer.itemName.compareTo(b.usedLayer.itemName);
    });

    final int width = layers
        .map((_ResolvedLayer layer) => layer.image.width)
        .reduce(_max);
    final int height = layers
        .map((_ResolvedLayer layer) => layer.image.height)
        .reduce(_max);

    final img.Image composite = img.Image(width: width, height: height);
    img.fill(composite, color: img.ColorRgba8(0, 0, 0, 0));
    for (final _ResolvedLayer layer in layers) {
      img.compositeImage(composite, layer.image, dstX: 0, dstY: 0);
    }

    final Map<String, LpcCreditRecord> uniqueCredits =
        <String, LpcCreditRecord>{};
    for (final _ResolvedLayer layer in layers) {
      for (final LpcCreditRecord credit in layer.credits) {
        uniqueCredits.putIfAbsent(
          '${credit.file}|${layer.usedLayer.assetPath}',
          () => credit,
        );
      }
    }

    return LpcRenderResult(
      pngBytes: img.encodePng(composite),
      width: width,
      height: height,
      usedLayers: layers
          .map((_ResolvedLayer layer) => layer.usedLayer)
          .toList(),
      credits: uniqueCredits.values.toList(),
    );
  }

  String _resolveBodyColorVariant(LpcRenderRequest request) {
    for (final String itemId in request.selections.keys) {
      if (catalog.itemsById[itemId]?.typeName == 'body') {
        return request.selections[itemId] ?? 'light';
      }
    }
    return 'light';
  }

  Future<String?> _resolveAssetPath({
    required String basePath,
    required String animation,
    required String variant,
  }) async {
    final String cacheKey = '$basePath|$animation|$variant';
    if (_resolvedAssetPathCache.containsKey(cacheKey)) {
      final String? cached = _resolvedAssetPathCache.remove(cacheKey);
      _resolvedAssetPathCache[cacheKey] = cached;
      return cached;
    }

    final List<String> candidates = <String>[
      path.join(basePath, animation, '$variant.png'),
      path.join(basePath, '$animation.png'),
      path.join(basePath, '$variant.png'),
    ];

    for (final String candidate in candidates) {
      final String normalized = path.normalize(candidate);
      final File file = File(path.join(spritesheetsDirectory.path, normalized));
      if (await file.exists() || await _hasDiskCachedAsset(file)) {
        _rememberResolvedAssetPath(cacheKey, normalized);
        return normalized;
      }
    }

    _rememberResolvedAssetPath(cacheKey, null);
    return null;
  }

  Future<img.Image?> _loadDecodedImage(File file) async {
    final String cacheKey = path.normalize(file.path);
    if (_decodedAssetCache.containsKey(cacheKey)) {
      final img.Image cached = _decodedAssetCache.remove(cacheKey)!;
      _decodedAssetCache[cacheKey] = cached;
      return cached;
    }

    final img.Image? diskCachedImage = await _readDiskCachedImage(file);
    if (diskCachedImage != null) {
      _decodedAssetCache[cacheKey] = diskCachedImage;
      while (_decodedAssetCache.length > maxDecodedAssetCacheEntries) {
        _decodedAssetCache.remove(_decodedAssetCache.keys.first);
      }
      return diskCachedImage;
    }

    final Uint8List bytes = await file.readAsBytes();
    final img.Image? decoded = img.decodeImage(bytes);
    if (decoded != null) {
      _decodedAssetCache[cacheKey] = decoded;
      while (_decodedAssetCache.length > maxDecodedAssetCacheEntries) {
        _decodedAssetCache.remove(_decodedAssetCache.keys.first);
      }
      await _writeDiskCachedImage(file, decoded);
    }
    return decoded;
  }

  void _rememberResolvedAssetPath(String cacheKey, String? resolvedPath) {
    _resolvedAssetPathCache[cacheKey] = resolvedPath;
    while (_resolvedAssetPathCache.length > maxResolvedPathCacheEntries) {
      _resolvedAssetPathCache.remove(_resolvedAssetPathCache.keys.first);
    }
  }

  Future<img.Image?> _readDiskCachedImage(File sourceFile) async {
    final Directory? cacheDirectory = decodedAssetCacheDirectory;
    if (cacheDirectory == null) {
      return null;
    }

    final _DiskCacheLocation? location = await _resolveDiskCacheLocation(
      sourceFile,
    );
    if (location == null) {
      return null;
    }
    if (!await location.metadataFile.exists() ||
        !await location.dataFile.exists()) {
      return null;
    }

    try {
      final Map<String, dynamic> metadata =
          jsonDecode(await location.metadataFile.readAsString())
              as Map<String, dynamic>;
      final int width = metadata['width'] as int? ?? 0;
      final int height = metadata['height'] as int? ?? 0;
      if (width <= 0 || height <= 0) {
        return null;
      }

      final Uint8List bytes = await location.dataFile.readAsBytes();
      final int expectedLength = width * height * 4;
      if (bytes.lengthInBytes != expectedLength) {
        return null;
      }

      return img.Image.fromBytes(
        width: width,
        height: height,
        bytes: bytes.buffer,
        numChannels: 4,
        order: img.ChannelOrder.rgba,
      );
    } on Exception {
      return null;
    }
  }

  Future<bool> _hasDiskCachedAsset(File sourceFile) async {
    final Directory? cacheDirectory = decodedAssetCacheDirectory;
    if (cacheDirectory == null || !await cacheDirectory.exists()) {
      return false;
    }

    final String prefix =
        '${_sanitizeCacheStem(path.normalize(sourceFile.path).toLowerCase())}-';
    final List<FileSystemEntity> candidates = cacheDirectory.listSync();
    return candidates.any((FileSystemEntity entity) {
      if (entity is! File) {
        return false;
      }
      final String name = path.basename(entity.path);
      return name.startsWith(prefix) &&
          (name.endsWith('.json') || name.endsWith('.rgba'));
    });
  }

  Future<void> _writeDiskCachedImage(File sourceFile, img.Image decoded) async {
    final Directory? cacheDirectory = decodedAssetCacheDirectory;
    if (cacheDirectory == null) {
      return;
    }

    final _DiskCacheLocation location = await _buildDiskCacheLocation(
      sourceFile,
    );
    await cacheDirectory.create(recursive: true);
    final Uint8List bytes = Uint8List.fromList(
      decoded.getBytes(order: img.ChannelOrder.rgba),
    );
    await location.dataFile.writeAsBytes(bytes, flush: false);
    await location.metadataFile.writeAsString(
      jsonEncode(<String, Object>{
        'width': decoded.width,
        'height': decoded.height,
        'sourcePath': path.normalize(sourceFile.path),
      }),
      flush: false,
    );
  }

  Future<_DiskCacheLocation> _buildDiskCacheLocation(File sourceFile) async {
    final Directory cacheDirectory = decodedAssetCacheDirectory!;
    final FileStat stat = await sourceFile.stat();
    final String normalized = path.normalize(sourceFile.path).toLowerCase();
    final String stem = _sanitizeCacheStem(normalized);
    final String fingerprint =
        '$stem-${stat.size}-${stat.modified.millisecondsSinceEpoch}';
    return _DiskCacheLocation(
      dataFile: File(path.join(cacheDirectory.path, '$fingerprint.rgba')),
      metadataFile: File(path.join(cacheDirectory.path, '$fingerprint.json')),
    );
  }

  Future<_DiskCacheLocation?> _resolveDiskCacheLocation(File sourceFile) async {
    if (await sourceFile.exists()) {
      return _buildDiskCacheLocation(sourceFile);
    }

    final Directory? cacheDirectory = decodedAssetCacheDirectory;
    if (cacheDirectory == null || !await cacheDirectory.exists()) {
      return null;
    }

    final String prefix =
        '${_sanitizeCacheStem(path.normalize(sourceFile.path).toLowerCase())}-';
    final List<File> metadataFiles =
        cacheDirectory
            .listSync()
            .whereType<File>()
            .where(
              (File file) =>
                  path.basename(file.path).startsWith(prefix) &&
                  path.extension(file.path) == '.json',
            )
            .toList()
          ..sort(
            (File left, File right) =>
                right.lastModifiedSync().compareTo(left.lastModifiedSync()),
          );
    if (metadataFiles.isEmpty) {
      return null;
    }

    final File metadataFile = metadataFiles.first;
    final String baseName = path.basenameWithoutExtension(metadataFile.path);
    final File dataFile = File(
      path.join(cacheDirectory.path, '$baseName.rgba'),
    );
    if (!dataFile.existsSync()) {
      return null;
    }
    return _DiskCacheLocation(dataFile: dataFile, metadataFile: metadataFile);
  }

  String _sanitizeCacheStem(String value) {
    final String sanitized = value.replaceAll(RegExp(r'[^a-z0-9]+'), '_');
    if (sanitized.length <= 80) {
      return sanitized;
    }
    return sanitized.substring(sanitized.length - 80);
  }

  List<LpcCreditRecord> _creditsForAsset(
    LpcItemDefinition item,
    String assetPath,
  ) {
    final List<LpcCreditRecord> matches = item.credits.where((
      LpcCreditRecord credit,
    ) {
      final String file = path.posix.normalize(credit.file);
      return assetPath == file || assetPath.startsWith('$file/');
    }).toList();

    return matches.isEmpty ? item.credits : matches;
  }

  int _max(int a, int b) => a > b ? a : b;

  String? _inferRecolorGroup(LpcItemDefinition item) {
    final String haystack = <String>[
      item.typeName,
      item.category,
      item.name,
      ...item.tags,
      ...item.pathSegments,
    ].join(' ').toLowerCase();

    if (item.typeName == 'body' || item.matchBodyColor) {
      return 'body';
    }
    if (haystack.contains('leather') ||
        haystack.contains('belt') ||
        haystack.contains('boot') ||
        haystack.contains('quiver')) {
      return 'leather';
    }
    if (haystack.contains('armor') ||
        haystack.contains('metal') ||
        haystack.contains('plate') ||
        haystack.contains('steel') ||
        haystack.contains('mail') ||
        haystack.contains('helmet') ||
        haystack.contains('shield')) {
      return 'metal';
    }
    if (haystack.contains('cape') ||
        haystack.contains('cloak') ||
        haystack.contains('trim') ||
        haystack.contains('jewel') ||
        haystack.contains('accessor')) {
      return 'accent';
    }
    if (haystack.contains('cloth') ||
        haystack.contains('robe') ||
        haystack.contains('shirt') ||
        haystack.contains('hood') ||
        haystack.contains('torso') ||
        haystack.contains('dress')) {
      return 'cloth';
    }
    return null;
  }

  File _resolveExternalLayerFile(String rawPath) {
    final String normalized = path.normalize(rawPath.trim());
    if (path.isAbsolute(normalized)) {
      return File(normalized);
    }
    return File(path.join(Directory.current.path, normalized));
  }

  img.Image _applyRecolorIfNeeded(img.Image source, {String? recolorHex}) {
    final String? normalized = _normalizeHexColor(recolorHex);
    if (normalized == null) {
      return source;
    }

    final img.ColorRgb8 target = _parseHexColor(normalized);
    final img.Image recolored = img.Image.from(source);

    for (int y = 0; y < recolored.height; y++) {
      for (int x = 0; x < recolored.width; x++) {
        final img.Pixel pixel = recolored.getPixel(x, y);
        final int alpha = pixel.a.toInt();
        if (alpha == 0) {
          continue;
        }

        final double luminance =
            (0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b) / 255.0;
        final int red = (target.r * luminance).round().clamp(0, 255);
        final int green = (target.g * luminance).round().clamp(0, 255);
        final int blue = (target.b * luminance).round().clamp(0, 255);

        recolored.setPixelRgba(x, y, red, green, blue, alpha);
      }
    }

    return recolored;
  }

  String? _normalizeHexColor(String? input) {
    final String trimmed = input?.trim() ?? '';
    if (!RegExp(r'^#?[0-9A-Fa-f]{6}$').hasMatch(trimmed)) {
      return null;
    }
    return trimmed.startsWith('#') ? trimmed.substring(1) : trimmed;
  }

  img.ColorRgb8 _parseHexColor(String hex) {
    return img.ColorRgb8(
      int.parse(hex.substring(0, 2), radix: 16),
      int.parse(hex.substring(2, 4), radix: 16),
      int.parse(hex.substring(4, 6), radix: 16),
    );
  }
}

class _DiskCacheLocation {
  const _DiskCacheLocation({
    required this.dataFile,
    required this.metadataFile,
  });

  final File dataFile;
  final File metadataFile;
}

class _ResolvedLayer {
  const _ResolvedLayer({
    required this.image,
    required this.usedLayer,
    required this.credits,
  });

  final img.Image image;
  final UsedLpcLayer usedLayer;
  final List<LpcCreditRecord> credits;
}
