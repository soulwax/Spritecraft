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
        final img.Image? image = img.decodeImage(bytes);
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
