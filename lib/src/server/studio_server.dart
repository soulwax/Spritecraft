// File: lib/src/server/studio_server.dart

import 'dart:convert';
import 'dart:io';

import 'package:archive/archive.dart';
import 'package:mime/mime.dart';
import 'package:path/path.dart' as path;
import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as shelf_io;
import 'package:shelf_router/shelf_router.dart';
import 'package:shelf_static/shelf_static.dart';

import '../ai/gemini_sprite_planner.dart';
import '../config/runtime_config.dart';
import '../lpc/lpc_catalog.dart';
import '../lpc/lpc_renderer.dart';
import '../models/lpc_models.dart';
import '../models/sprite_plan.dart';
import '../persistence/history_repository.dart';
import 'export_support.dart';

class StudioServer {
  StudioServer._({
    required this.config,
    required this.catalog,
    required this.renderer,
    required this.historyRepository,
  });

  final RuntimeConfig config;
  final LpcCatalog catalog;
  final LpcRenderer renderer;
  final HistoryRepository? historyRepository;
  final Map<String, LpcRenderResult> _renderCache = <String, LpcRenderResult>{};

  static Future<StudioServer> create(RuntimeConfig config) async {
    final LpcCatalog catalog = await const LpcCatalogLoader().load(
      config.lpcDefinitionsDirectory,
    );

    return StudioServer._(
      config: config,
      catalog: catalog,
      renderer: LpcRenderer(
        catalog: catalog,
        spritesheetsDirectory: config.lpcSpritesheetsDirectory,
      ),
      historyRepository: await HistoryRepository.connect(config.databaseUrl),
    );
  }

  Future<HttpServer> serve({String host = '127.0.0.1', int port = 8080}) async {
    final Router router = Router()
      ..get('/health', _health)
      ..get('/api/studio/bootstrap', _bootstrap)
      ..get('/api/lpc/catalog', _catalog)
      ..post('/api/lpc/render', _render)
      ..post('/api/lpc/export', _export)
      ..post('/api/ai/brief', _brief)
      ..get('/api/history', _history)
      ..post('/api/history/save', _saveHistory)
      ..post('/api/history/restore', _restoreHistory)
      ..get('/api/history/<id>', _historyEntry)
      ..delete('/api/history/<id>', _deleteHistory);

    final MimeTypeResolver mimeTypeResolver = MimeTypeResolver();
    final Handler staticHandler = createStaticHandler(
      config.studioDirectory.path,
      defaultDocument: 'index.html',
      serveFilesOutsidePath: false,
      contentTypeResolver: mimeTypeResolver,
    );

    final Handler handler = Pipeline().addMiddleware(logRequests()).addHandler((
      Request request,
    ) async {
      if (request.url.path.startsWith('api/')) {
        final Response response = await router.call(request);
        if (response.statusCode == 404) {
          return _json(404, <String, Object>{'error': 'Not found'});
        }
        return response;
      }
      return staticHandler(request);
    });

    return shelf_io.serve(handler, host, port);
  }

  Future<Response> _bootstrap(Request request) async {
    final List<StudioHistoryEntry> recent =
        await historyRepository?.listRecent(limit: 8) ?? <StudioHistoryEntry>[];

    final Map<String, String> defaults = <String, String>{
      if (catalog.itemsById.containsKey('body')) 'body': 'light',
      if (catalog.itemsById.containsKey('heads_human_male'))
        'heads_human_male': 'light',
    };

    return _json(200, <String, Object?>{
      'config': <String, Object?>{
        'hasGemini': config.hasGemini,
        'hasDatabase': config.hasDatabase,
        'hasLpcProject': config.hasLpcProject,
      },
      'catalog': catalog.toSummaryJson(),
      'defaults': <String, Object?>{
        'bodyType': catalog.bodyTypes.contains('male')
            ? 'male'
            : (catalog.bodyTypes.isEmpty ? null : catalog.bodyTypes.first),
        'animation': catalog.animations.contains('idle')
            ? 'idle'
            : (catalog.animations.isEmpty ? null : catalog.animations.first),
        'selections': defaults,
      },
      'recent': recent
          .map((StudioHistoryEntry entry) => entry.toJson())
          .toList(),
    });
  }

  Future<Response> _health(Request request) async {
    final List<Map<String, String>> checks = <Map<String, String>>[
      _healthCheck(
        label: 'Studio assets',
        isOk: config.studioDirectory.existsSync(),
        okDetail: 'Studio assets are ready.',
        failDetail: 'Missing studio directory at ${config.studioDirectory.path}.',
      ),
      _healthCheck(
        label: 'LPC project',
        isOk: config.hasLpcProject,
        okDetail: 'LPC submodule directory found.',
        failDetail:
            'Missing lpc-spritesheet-creator. Run git submodule update --init --recursive.',
      ),
      _healthCheck(
        label: 'Definitions',
        isOk: config.lpcDefinitionsDirectory.existsSync(),
        okDetail: 'Sheet definitions directory is present.',
        failDetail:
            'Missing sheet definitions at ${config.lpcDefinitionsDirectory.path}.',
      ),
      _healthCheck(
        label: 'Spritesheets',
        isOk: config.lpcSpritesheetsDirectory.existsSync(),
        okDetail: 'Spritesheet assets directory is present.',
        failDetail:
            'Missing spritesheets at ${config.lpcSpritesheetsDirectory.path}.',
      ),
      <String, String>{
        'label': 'Gemini',
        'status': config.hasGemini ? 'ok' : 'warning',
        'detail': config.hasGemini
            ? 'GEMINI_API_KEY is configured.'
            : 'GEMINI_API_KEY is not configured. AI suggestions will fall back to local recommendations.',
      },
      <String, String>{
        'label': '.env configuration',
        'status': config.configurationWarnings.isEmpty ? 'ok' : 'warning',
        'detail': config.configurationWarnings.isEmpty
            ? 'No .env parsing issues were detected.'
            : config.configurationWarnings.join(' '),
      },
      <String, String>{
        'label': 'Database',
        'status': historyRepository != null
            ? 'ok'
            : (config.hasDatabase ? 'warning' : 'warning'),
        'detail': historyRepository != null
            ? 'History persistence is available.'
            : (config.hasDatabase
                  ? 'DATABASE_URL is set, but history persistence is currently unavailable.'
                  : 'DATABASE_URL is not configured. History endpoints will be limited.'),
      ),
      <String, String>{
        'label': 'Export directory',
        'status': 'ok',
        'detail': 'Exports will be written to ${config.exportDirectory.path}.',
      },
    ];

    final bool hasErrors = checks.any(
      (Map<String, String> check) => check['status'] == 'error',
    );
    final bool hasWarnings = checks.any(
      (Map<String, String> check) => check['status'] == 'warning',
    );

    return _json(200, <String, Object>{
      'status': hasErrors
          ? 'error'
          : (hasWarnings ? 'warning' : 'ok'),
      'timestamp': DateTime.now().toUtc().toIso8601String(),
      'checks': checks,
    });
  }

  Map<String, String> _healthCheck({
    required String label,
    required bool isOk,
    required String okDetail,
    required String failDetail,
  }) {
    return <String, String>{
      'label': label,
      'status': isOk ? 'ok' : 'error',
      'detail': isOk ? okDetail : failDetail,
    };
  }

  Future<Response> _catalog(Request request) async {
    final String query = request.url.queryParameters['q'] ?? '';
    final String? bodyType = request.url.queryParameters['bodyType'];
    final String? animation = request.url.queryParameters['animation'];

    final List<LpcItemDefinition> items = catalog.search(
      query: query,
      bodyType: bodyType,
      animation: animation,
    );

    return _json(200, <String, Object>{
      'items': items.map((LpcItemDefinition item) => item.toJson()).toList(),
    });
  }

  Future<LpcRenderResult> _renderWithCache(LpcRenderRequest request) async {
    final String cacheKey = _buildRenderCacheKey(request);
    final LpcRenderResult? cached = _renderCache.remove(cacheKey);
    if (cached != null) {
      _renderCache[cacheKey] = cached;
      return cached;
    }

    final LpcRenderResult rendered = await renderer.render(request);
    _renderCache[cacheKey] = rendered;

    if (_renderCache.length > 48) {
      _renderCache.remove(_renderCache.keys.first);
    }

    return rendered;
  }

  String _buildRenderCacheKey(LpcRenderRequest request) {
    final List<MapEntry<String, String>> orderedSelections =
        request.selections.entries.toList()
          ..sort(
            (MapEntry<String, String> left, MapEntry<String, String> right) =>
                left.key.compareTo(right.key),
          );

    return jsonEncode(<String, Object?>{
      'bodyType': request.bodyType,
      'animation': request.animation,
      'prompt': request.prompt,
      'selections': Map<String, String>.fromEntries(orderedSelections),
    });
  }

  Future<Response> _render(Request request) async {
    try {
      final LpcRenderRequest renderRequest = LpcRenderRequest.fromJson(
        await request.readAsJson(),
      );
      final LpcRenderResult result = await _renderWithCache(renderRequest);
      final String imageName = _buildPreviewImageName(renderRequest);
      return _json(
        200,
        result.toApiJson(request: renderRequest, imageName: imageName),
      );
    } on StateError catch (error) {
      return _json(400, <String, Object>{'error': error.message});
    }
  }

  Future<Response> _export(Request request) async {
    try {
      final Map<String, dynamic> payload = await request.readAsJson();
      final LpcRenderRequest renderRequest = LpcRenderRequest.fromJson(payload);
      final LpcRenderResult result = await _renderWithCache(renderRequest);
      final String projectName = payload['projectName']?.toString() ?? '';
      final String enginePreset =
          payload['enginePreset']?.toString().toLowerCase() ?? 'none';

      final String baseName = ExportSupport.buildBaseName(
        prompt: renderRequest.prompt,
        projectName: projectName,
        timestamp: DateTime.now(),
      );
      final Map<String, Object?> metadata = result.toMetadataJson(
        request: renderRequest,
        imageName: '$baseName.png',
      );

      await config.exportDirectory.create(recursive: true);
      final File imageFile = File(
        path.join(config.exportDirectory.path, '$baseName.png'),
      );
      final File metadataFile = File(
        path.join(config.exportDirectory.path, '$baseName.json'),
      );

      await imageFile.writeAsBytes(result.pngBytes);
      await metadataFile.writeAsString(
        const JsonEncoder.withIndent('  ').convert(
          metadata,
        ),
      );

      final List<File> extraFiles = await ExportSupport.writeEnginePresetFiles(
        exportDirectory: config.exportDirectory,
        enginePreset: enginePreset,
        baseName: baseName,
        metadata: metadata,
      );
      final File zipFile = await ExportSupport.writeExportBundle(
        exportDirectory: config.exportDirectory,
        baseName: baseName,
        files: <File>[imageFile, metadataFile, ...extraFiles],
      );

      return _json(200, <String, Object?>{
        'imagePath': path.normalize(imageFile.path),
        'metadataPath': path.normalize(metadataFile.path),
        'bundlePath': path.normalize(zipFile.path),
        'enginePreset': enginePreset,
        'extraPaths': extraFiles
            .map((File file) => path.normalize(file.path))
            .toList(),
        'baseName': baseName,
      });
    } on StateError catch (error) {
      return _json(400, <String, Object>{'error': error.message});
    }
  }

  Future<Response> _brief(Request request) async {
    final Map<String, dynamic> payload = await request.readAsJson();
    final String prompt = payload['prompt']?.toString().trim() ?? '';
    final String bodyType = payload['bodyType']?.toString() ?? 'male';
    if (prompt.isEmpty) {
      return _json(400, <String, Object>{'error': 'Prompt is required.'});
    }

    SpritePlan? plan;
    if (config.hasGemini) {
      try {
        plan = await GeminiSpritePlanner(apiKey: config.geminiApiKey)
            .suggestPlan(
              prompt: prompt,
              styleHint: 'LPC-inspired pixel art with modular layers',
            );
      } on Exception {
        plan = null;
      }
    }

    final String effectiveQuery = <String>[
      prompt,
      if (plan != null) ...plan.styleTags,
      if (plan != null) plan.concept,
    ].join(' ');

    final List<LpcItemDefinition> recommendations = catalog.search(
      query: effectiveQuery,
      bodyType: bodyType,
      animation: 'idle',
      limit: 18,
    );

    return _json(200, <String, Object?>{
      'plan': plan?.toJson(),
      'recommendations': recommendations
          .map((LpcItemDefinition item) => item.toJson())
          .toList(),
    });
  }

  Future<Response> _history(Request request) async {
    final List<StudioHistoryEntry> recent =
        await historyRepository?.listRecent(limit: 20) ??
        <StudioHistoryEntry>[];
    return _json(200, <String, Object>{
      'items': recent.map((StudioHistoryEntry item) => item.toJson()).toList(),
    });
  }

  Future<Response> _saveHistory(Request request) async {
    if (historyRepository == null) {
      return _json(503, <String, Object>{
        'error': 'DATABASE_URL is not configured.',
      });
    }

    final Map<String, dynamic> payload = await request.readAsJson();
    final LpcRenderRequest renderRequest = LpcRenderRequest.fromJson(payload);
    final LpcRenderResult result = await renderer.render(renderRequest);
    final StudioHistoryEntry entry = await historyRepository!.save(
      request: renderRequest,
      renderResult: result,
      details: <String, Object?>{
        'projectName': payload['projectName']?.toString(),
        'notes': payload['notes']?.toString(),
        'enginePreset': payload['enginePreset']?.toString(),
        'tags': payload['tags'] is List<dynamic>
            ? (payload['tags'] as List<dynamic>)
                  .map((dynamic value) => value.toString())
                  .toList()
            : <String>[],
        'renderSettings': payload['renderSettings'] is Map
            ? Map<String, Object?>.from(
                payload['renderSettings'] as Map<dynamic, dynamic>,
              )
            : <String, Object?>{},
        'exportSettings': payload['exportSettings'] is Map
            ? Map<String, Object?>.from(
                payload['exportSettings'] as Map<dynamic, dynamic>,
              )
            : <String, Object?>{},
        'promptHistory': payload['promptHistory'] is List<dynamic>
            ? (payload['promptHistory'] as List<dynamic>)
                  .map((dynamic value) => value.toString())
                  .toList()
            : <String>[],
        'exportHistory': payload['exportHistory'] is List<dynamic>
            ? (payload['exportHistory'] as List<dynamic>)
                  .whereType<Map>()
                  .map(
                    (Map<dynamic, dynamic> value) =>
                        Map<String, Object?>.from(value),
                  )
                  .toList()
            : <Map<String, Object?>>[],
      },
    );

    return _json(200, entry.toJson());
  }

  Future<Response> _historyEntry(Request request, String id) async {
    if (historyRepository == null) {
      return _json(503, <String, Object>{
        'error': 'DATABASE_URL is not configured.',
      });
    }
    final StudioHistoryEntry? entry = await historyRepository!.findById(id);
    if (entry == null) {
      return _json(404, <String, Object>{'error': 'History entry not found.'});
    }
    return _json(200, entry.toJson());
  }

  Future<Response> _deleteHistory(Request request, String id) async {
    if (historyRepository == null) {
      return _json(503, <String, Object>{
        'error': 'DATABASE_URL is not configured.',
      });
    }
    final bool deleted = await historyRepository!.delete(id);
    if (!deleted) {
      return _json(404, <String, Object>{'error': 'History entry not found.'});
    }
    return _json(200, <String, Object>{'deleted': id});
  }

  /// Restores a saved history entry: re-renders it and returns the full render
  /// payload so the frontend can reload selections, preview, and credits.
  Future<Response> _restoreHistory(Request request) async {
    if (historyRepository == null) {
      return _json(503, <String, Object>{
        'error': 'DATABASE_URL is not configured.',
      });
    }

    final Map<String, dynamic> payload = await request.readAsJson();
    final String id = payload['id']?.toString() ?? '';
    if (id.isEmpty) {
      return _json(400, <String, Object>{'error': 'id is required.'});
    }

    final StudioHistoryEntry? entry = await historyRepository!.findById(id);
    if (entry == null) {
      return _json(404, <String, Object>{'error': 'History entry not found.'});
    }

    final LpcRenderRequest renderRequest = LpcRenderRequest(
      bodyType: entry.bodyType,
      animation: entry.animation,
      selections: entry.selections,
      prompt: entry.prompt,
    );

    try {
      final LpcRenderResult result = await renderer.render(renderRequest);
      final String imageName = _buildPreviewImageName(renderRequest);
      return _json(200, <String, Object?>{
        ...result.toApiJson(request: renderRequest, imageName: imageName),
        'restored': entry.toJson(),
      });
    } on StateError catch (error) {
      return _json(400, <String, Object>{'error': error.message});
    }
  }

  Future<void> close() async {
    await historyRepository?.close();
  }

  Response _json(int status, Map<String, Object?> body) {
    return Response(
      status,
      headers: <String, String>{
        'content-type': 'application/json; charset=utf-8',
      },
      body: jsonEncode(body),
    );
  }

  String _buildPreviewImageName(LpcRenderRequest request) {
    return '${_buildExportBaseName(request, includeTimestamp: false)}.png';
  }

  String _buildExportBaseName(
    LpcRenderRequest request, {
    String projectName = '',
    bool includeTimestamp = true,
  }) {
    final String preferredStem = projectName.trim().isNotEmpty
        ? projectName
        : (request.prompt?.trim().isNotEmpty ?? false)
        ? request.prompt!
        : 'spritecraft-${request.bodyType}-${request.animation}';
    final String stem = _sanitizeFileStem(preferredStem);
    if (!includeTimestamp) {
      return stem;
    }

    final DateTime now = DateTime.now();
    final String timestamp =
        '${now.year.toString().padLeft(4, '0')}'
        '${now.month.toString().padLeft(2, '0')}'
        '${now.day.toString().padLeft(2, '0')}-'
        '${now.hour.toString().padLeft(2, '0')}'
        '${now.minute.toString().padLeft(2, '0')}'
        '${now.second.toString().padLeft(2, '0')}';
    return '$stem-$timestamp';
  }

  String _sanitizeFileStem(String value) {
    final String sanitized = value
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'-+'), '-')
        .replaceAll(RegExp(r'^-|-$'), '');
    return sanitized.isEmpty ? 'spritecraft-export' : sanitized;
  }

  Future<List<File>> _writeEnginePresetFiles({
    required String enginePreset,
    required String baseName,
    required LpcRenderRequest request,
    required LpcRenderResult renderResult,
  }) async {
    final List<File> files = <File>[];
    final JsonEncoder encoder = const JsonEncoder.withIndent('  ');

    if (enginePreset == 'godot' || enginePreset == 'both') {
      final File godotFile = File(
        path.join(config.exportDirectory.path, '$baseName.godot.json'),
      );
      await godotFile.writeAsString(
        encoder.convert(<String, Object?>{
          'engine': 'godot',
          'resourceType': 'SpriteFrames',
          'texture': '$baseName.png',
          'animations': <Object>[
            <String, Object>{
              'name': request.animation,
              'fps': 8,
              'loop': true,
              'frames': <Object>[
                <String, Object>{
                  'index': 0,
                  'duration': 1,
                  'region': <String, Object>{
                    'x': 0,
                    'y': 0,
                    'width': renderResult.width,
                    'height': renderResult.height,
                  },
                },
              ],
            },
          ],
        }),
      );
      files.add(godotFile);
    }

    if (enginePreset == 'unity' || enginePreset == 'both') {
      final File unityFile = File(
        path.join(config.exportDirectory.path, '$baseName.unity.json'),
      );
      await unityFile.writeAsString(
        encoder.convert(<String, Object?>{
          'engine': 'unity',
          'texture': '$baseName.png',
          'importer': <String, Object>{
            'spriteMode': 'Multiple',
            'pixelsPerUnit': 100,
            'meshType': 'FullRect',
            'sprites': <Object>[
              <String, Object>{
                'name': request.animation,
                'rect': <String, Object>{
                  'x': 0,
                  'y': 0,
                  'width': renderResult.width,
                  'height': renderResult.height,
                },
                'pivot': <String, double>{'x': 0.5, 'y': 0.5},
                'alignment': 'Center',
              },
            ],
          },
        }),
      );
      files.add(unityFile);
    }

    return files;
  }

  Future<File> _writeExportBundle({
    required String baseName,
    required List<File> files,
  }) async {
    final Archive archive = Archive();
    for (final File file in files) {
      archive.addFile(
        ArchiveFile(
          path.basename(file.path),
          await file.length(),
          await file.readAsBytes(),
        ),
      );
    }

    final File zipFile = File(
      path.join(config.exportDirectory.path, '$baseName.zip'),
    );
    await zipFile.writeAsBytes(ZipEncoder().encode(archive));
    return zipFile;
  }
}

extension on Request {
  Future<Map<String, dynamic>> readAsJson() async {
    final String raw = await readAsString();
    if (raw.isEmpty) {
      return <String, dynamic>{};
    }
    return jsonDecode(raw) as Map<String, dynamic>;
  }
}
