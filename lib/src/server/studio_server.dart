import 'dart:convert';
import 'dart:io';

import 'package:mime/mime.dart';
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
      ..get('/api/studio/bootstrap', _bootstrap)
      ..get('/api/lpc/catalog', _catalog)
      ..post('/api/lpc/render', _render)
      ..post('/api/ai/brief', _brief)
      ..get('/api/history', _history)
      ..post('/api/history/save', _saveHistory);

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

  Future<Response> _render(Request request) async {
    try {
      final LpcRenderRequest renderRequest = LpcRenderRequest.fromJson(
        await request.readAsJson(),
      );
      final LpcRenderResult result = await renderer.render(renderRequest);
      return _json(
        200,
        result.toApiJson(
          request: renderRequest,
          imageName: 'spritecraft-${renderRequest.animation}.png',
        ),
      );
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

    final LpcRenderRequest renderRequest = LpcRenderRequest.fromJson(
      await request.readAsJson(),
    );
    final LpcRenderResult result = await renderer.render(renderRequest);
    final StudioHistoryEntry entry = await historyRepository!.save(
      request: renderRequest,
      renderResult: result,
    );

    return _json(200, entry.toJson());
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
