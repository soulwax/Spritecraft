// File: lib/src/lpc/lpc_renderer.dart

import 'dart:io';
import 'dart:typed_data';

import 'package:image/image.dart' as img;
import 'package:path/path.dart' as path;

import '../models/lpc_models.dart';

class LpcRenderer {
  const LpcRenderer({
    required this.catalog,
    required this.spritesheetsDirectory,
  });

  final LpcCatalog catalog;
  final Directory spritesheetsDirectory;

  Future<LpcRenderResult> render(LpcRenderRequest request) async {
    if (!await spritesheetsDirectory.exists()) {
      throw StateError(
        'LPC spritesheets were not found at ${spritesheetsDirectory.path}.',
      );
    }

    final String bodyColorVariant = _resolveBodyColorVariant(request);
    final List<_ResolvedLayer> layers = <_ResolvedLayer>[];

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
          continue;
        }

        final String? relativeAssetPath = await _resolveAssetPath(
          basePath: basePath,
          animation: request.animation,
          variant: selectedVariant,
        );
        if (relativeAssetPath == null) {
          continue;
        }

        final File file = File(
          path.join(spritesheetsDirectory.path, relativeAssetPath),
        );
        final Uint8List bytes = await file.readAsBytes();
        final img.Image? decoded = img.decodeImage(bytes);
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

    if (layers.isEmpty) {
      throw StateError(
        'No renderable layers were found for ${request.bodyType} / ${request.animation}.',
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
    final List<String> candidates = <String>[
      path.join(basePath, animation, '$variant.png'),
      path.join(basePath, '$animation.png'),
      path.join(basePath, '$variant.png'),
    ];

    for (final String candidate in candidates) {
      final String normalized = path.normalize(candidate);
      final File file = File(path.join(spritesheetsDirectory.path, normalized));
      if (await file.exists()) {
        return normalized;
      }
    }

    return null;
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
