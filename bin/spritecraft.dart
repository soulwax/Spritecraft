// File: bin/spritecraft.dart

import 'dart:convert';
import 'dart:async';
import 'dart:io';

import 'package:args/args.dart';
import 'package:path/path.dart' as path;
import 'package:spritecraft/spritesheet_creator.dart';

const String version = '0.32.0';
const Duration _studioStartupTimeout = Duration(seconds: 20);

ArgParser buildParser() {
  final ArgParser parser = ArgParser();

  parser.addFlag(
    'help',
    abbr: 'h',
    negatable: false,
    help: 'Print this usage information.',
  );

  parser.addFlag('version', negatable: false, help: 'Print the tool version.');

  parser.addCommand(
    'pack',
    ArgParser()
      ..addOption(
        'input',
        abbr: 'i',
        help: 'Directory containing source frames.',
      )
      ..addOption(
        'output',
        abbr: 'o',
        help: 'Output PNG path for the packed sheet.',
      )
      ..addOption(
        'metadata',
        abbr: 'm',
        help: 'Output JSON path for metadata.',
        defaultsTo: path.join('build', 'spritesheet.json'),
      )
      ..addOption('columns', help: 'Fixed number of columns to use.')
      ..addOption('padding', help: 'Pixels between frames.', defaultsTo: '0')
      ..addOption('tile-width', help: 'Force every tile to this width.')
      ..addOption('tile-height', help: 'Force every tile to this height.')
      ..addOption(
        'animation-name',
        help: 'Animation sequence name to write into metadata.',
        defaultsTo: 'default',
      )
      ..addOption(
        'frame-duration-ms',
        help: 'Per-frame duration in milliseconds for metadata.',
        defaultsTo: '100',
      )
      ..addOption(
        'pivot-x',
        help:
            'Per-frame pivot X in pixels for metadata. Defaults to tile center.',
      )
      ..addOption(
        'pivot-y',
        help:
            'Per-frame pivot Y in pixels for metadata. Defaults to tile center.',
      )
      ..addOption(
        'layout',
        help: 'Layout mode for packed output: uniform-grid or atlas.',
        defaultsTo: 'uniform-grid',
      )
      ..addFlag(
        'trim-transparent',
        negatable: false,
        help:
            'Trim transparent bounds before packing, useful with atlas layout.',
      )
      ..addFlag(
        'power-of-two',
        negatable: false,
        help: 'Expand sheet dimensions to the next power of two.',
      ),
  );

  parser.addCommand(
    'plan',
    ArgParser()
      ..addOption(
        'prompt',
        abbr: 'p',
        help: 'Describe the sprite or animation to plan.',
      )
      ..addOption('frame-count', help: 'Optional animation frame target.')
      ..addOption('style', help: 'Optional style hint.')
      ..addOption(
        'model',
        help: 'Gemini model to use.',
        defaultsTo: 'gemini-2.5-flash',
      ),
  );

  parser.addCommand(
    'studio',
    ArgParser()
      ..addOption(
        'host',
        help: 'Host interface to bind.',
        defaultsTo: '127.0.0.1',
      )
      ..addOption(
        'port',
        help: 'Port to serve the SpriteCraft backend API on.',
        defaultsTo: '8080',
      )
      ..addFlag(
        'open',
        help: 'Open the backend URL in the default browser after startup.',
        defaultsTo: false,
      ),
  );

  parser.addCommand(
    'app',
    ArgParser()
      ..addOption(
        'host',
        help: 'Host interface for the Dart backend API.',
        defaultsTo: '127.0.0.1',
      )
      ..addOption(
        'port',
        help: 'Port for the Dart backend API.',
        defaultsTo: '8080',
      )
      ..addOption(
        'web-port',
        help: 'Port for studio dev server.',
        defaultsTo: '3000',
      )
      ..addOption(
        'web-dir',
        help: 'Path to the studio app directory.',
        defaultsTo: 'studio',
      )
      ..addOption(
        'package-manager',
        help: 'Web package manager to use: auto, pnpm, npm, yarn, or bun.',
        defaultsTo: 'auto',
      )
      ..addFlag(
        'open',
        help: 'Open the web app in the default browser after startup.',
        defaultsTo: true,
      ),
  );

  return parser;
}

void printUsage(ArgParser parser) {
  print('Usage: dart run bin/spritecraft.dart <command> [arguments]');
  print('');
  print('Commands:');
  print(
    '  pack    Build a spritesheet PNG and JSON manifest from a folder of frames.',
  );
  print('  plan    Ask Gemini for a structured sprite animation plan.');
  print('  studio  Run the SpriteCraft Dart backend API used by studio.');
  print('  app     Run the backend API and studio together.');
  print('');
  print(parser.usage);
}

Future<void> main(List<String> arguments) async {
  final ArgParser parser = buildParser();

  try {
    final ArgResults results = parser.parse(arguments);

    if (results.flag('help')) {
      printUsage(parser);
      return;
    }

    if (results.flag('version')) {
      print('spritecraft version: $version');
      return;
    }

    switch (results.command?.name) {
      case 'pack':
        await _runPack(results.command!);
      case 'plan':
        await _runPlan(results.command!);
      case 'studio':
        await _runStudio(results.command!);
      case 'app':
        await _runApp(results.command!);
      default:
        printUsage(parser);
    }
  } on FormatException catch (error) {
    stderr.writeln(error.message);
    stderr.writeln('');
    printUsage(parser);
    exitCode = 64;
  } on ArgumentError catch (error) {
    stderr.writeln(error.message);
    exitCode = 64;
  } on StateError catch (error) {
    stderr.writeln(error.message);
    exitCode = 1;
  }
}

Future<void> _runPack(ArgResults results) async {
  final String? input = results.option('input');
  final String? output = results.option('output');
  final String metadata = results.option('metadata')!;

  if (input == null || input.isEmpty) {
    throw ArgumentError('The pack command requires --input.');
  }
  if (output == null || output.isEmpty) {
    throw ArgumentError('The pack command requires --output.');
  }

  final SpritesheetOptions options = SpritesheetOptions(
    inputDirectory: input,
    outputImagePath: output,
    outputMetadataPath: metadata,
    columns: _parseIntOption(results, 'columns'),
    padding: _parseIntOption(results, 'padding') ?? 0,
    forcePowerOfTwo: results.flag('power-of-two'),
    tileWidth: _parseIntOption(results, 'tile-width'),
    tileHeight: _parseIntOption(results, 'tile-height'),
    animationName: results.option('animation-name') ?? 'default',
    frameDurationMs: _parseIntOption(results, 'frame-duration-ms') ?? 100,
    pivotX: _parseIntOption(results, 'pivot-x'),
    pivotY: _parseIntOption(results, 'pivot-y'),
    layoutMode: results.option('layout') ?? 'uniform-grid',
    trimTransparentBounds: results.flag('trim-transparent'),
  );

  final SpritesheetBuildResult result = await const SpritesheetPacker().pack(
    options,
  );
  stdout.writeln('Packed ${result.frames.length} frame(s).');
  stdout.writeln('Image: ${result.imagePath}');
  stdout.writeln('Metadata: ${result.metadataPath}');
  stdout.writeln('Sheet: ${result.sheetWidth}x${result.sheetHeight}');
  stdout.writeln('Grid: ${result.columns} column(s) x ${result.rows} row(s)');
}

Future<void> _runPlan(ArgResults results) async {
  final String? prompt = results.option('prompt');
  if (prompt == null || prompt.isEmpty) {
    throw ArgumentError('The plan command requires --prompt.');
  }

  final String apiKey = Platform.environment['GEMINI_API_KEY'] ?? '';
  if (apiKey.isEmpty) {
    throw StateError('Set GEMINI_API_KEY before using the plan command.');
  }

  final GeminiSpritePlanner planner = GeminiSpritePlanner(
    apiKey: apiKey,
    model: results.option('model')!,
  );

  final SpritePlan plan = await planner.suggestPlan(
    prompt: prompt,
    frameCountHint: _parseIntOption(results, 'frame-count'),
    styleHint: results.option('style'),
  );

  stdout.writeln(const JsonEncoder.withIndent('  ').convert(plan.toJson()));
}

Future<void> _runStudio(ArgResults results) async {
  stdout.writeln('Loading SpriteCraft backend configuration...');
  final RuntimeConfig config = await _loadRuntimeConfig();
  stdout.writeln('Preparing backend services...');
  final StudioServer studioServer = await _createStudioServer(config);

  final String host = results.option('host')!;
  final int port = _parseIntOption(results, 'port') ?? 8080;
  stdout.writeln('Binding backend API on $host:$port...');
  final HttpServer server = await _serveStudioServer(
    studioServer,
    host: host,
    port: port,
  );
  final Uri studioUri = Uri.parse(
    'http://${server.address.host}:${server.port}',
  );

  stdout.writeln('SpriteCraft backend running at $studioUri');
  stdout.writeln(
    'Start studio separately for the UI. This Dart process now serves backend APIs only.',
  );
  if (!config.hasLpcProject) {
    stdout.writeln(
      'Warning: LPC source assets were not found in ./lpc-spritesheet-creator.',
    );
  }
  if (results.flag('open')) {
    await _openBrowser(studioUri);
  }
}

Future<void> _runApp(ArgResults results) async {
  stdout.writeln('Loading SpriteCraft app configuration...');
  final RuntimeConfig config = await _loadRuntimeConfig();
  stdout.writeln('Preparing backend services...');
  final StudioServer studioServer = await _createStudioServer(config);

  final String host = results.option('host')!;
  final int port = _parseIntOption(results, 'port') ?? 8080;
  final int webPort = _parseIntOption(results, 'web-port') ?? 3000;
  final Directory webDirectory = Directory(
    path.normalize(
      path.isAbsolute(results.option('web-dir')!)
          ? results.option('web-dir')!
          : path.join(config.projectRoot.path, results.option('web-dir')!),
    ),
  );

  if (!webDirectory.existsSync()) {
    throw StateError('studio directory was not found at ${webDirectory.path}.');
  }
  if (!File(path.join(webDirectory.path, 'package.json')).existsSync()) {
    throw StateError(
      'No package.json was found in ${webDirectory.path}. Expected a studio app there.',
    );
  }

  final WebPackageManager packageManager = detectWebPackageManager(
    webDirectory,
    preferred: results.option('package-manager') ?? 'auto',
  );
  final String packageManagerCommand = webPackageManagerCommand(packageManager);
  final List<String> installArguments = buildWebInstallArguments(
    packageManager,
  );
  final List<String> webArguments = buildWebDevArguments(
    packageManager,
    port: webPort,
  );

  stdout.writeln('Binding backend API on $host:$port...');
  final HttpServer server = await _serveStudioServer(
    studioServer,
    host: host,
    port: port,
  );
  final Uri backendUri = Uri.parse(
    'http://${server.address.host}:${server.port}',
  );
  final Uri webUri = Uri.parse('http://localhost:$webPort');

  stdout.writeln('SpriteCraft backend running at $backendUri');
  stdout.writeln(
    'Starting studio from ${webDirectory.path} with $packageManagerCommand ${webArguments.join(' ')}',
  );
  stdout.writeln('Waiting for studio to become reachable...');
  if (!config.hasLpcProject) {
    stdout.writeln(
      'Warning: LPC source assets were not found in ./lpc-spritesheet-creator.',
    );
  }

  if (!webDependenciesInstalled(webDirectory)) {
    stdout.writeln(
      'Studio dependencies are missing. Running $packageManagerCommand ${installArguments.join(' ')}...',
    );
    final int installExitCode = await _runWebCommand(
      packageManagerCommand,
      installArguments,
      workingDirectory: webDirectory.path,
      environment: <String, String>{
        ...Platform.environment,
        'NEXT_PUBLIC_SPRITECRAFT_API_BASE': backendUri.toString(),
        'PORT': '$webPort',
      },
    );
    if (installExitCode != 0) {
      await server.close(force: true);
      throw StateError(
        'Could not install studio dependencies. $packageManagerCommand exited with code $installExitCode.',
      );
    }
  }

  final Process webProcess;
  try {
    webProcess = await Process.start(
      packageManagerCommand,
      webArguments,
      workingDirectory: webDirectory.path,
      runInShell: true,
      environment: <String, String>{
        ...Platform.environment,
        'NEXT_PUBLIC_SPRITECRAFT_API_BASE': backendUri.toString(),
        'PORT': '$webPort',
      },
    );
  } on ProcessException catch (error) {
    await server.close(force: true);
    throw StateError(
      'Could not start studio with $packageManagerCommand. ${error.message}',
    );
  }

  _pipePrefixedOutput(webProcess.stdout, prefix: '[web]');
  _pipePrefixedOutput(webProcess.stderr, prefix: '[web]');

  final Completer<void> shutdownCompleter = Completer<void>();
  final List<StreamSubscription<ProcessSignal>> signalSubscriptions =
      <StreamSubscription<ProcessSignal>>[];

  Future<void> requestShutdown(String reason) async {
    if (shutdownCompleter.isCompleted) {
      return;
    }
    stdout.writeln(reason);
    shutdownCompleter.complete();
  }

  signalSubscriptions.add(
    ProcessSignal.sigint.watch().listen((_) {
      unawaited(requestShutdown('Stopping SpriteCraft app...'));
    }),
  );

  if (!Platform.isWindows) {
    signalSubscriptions.add(
      ProcessSignal.sigterm.watch().listen((_) {
        unawaited(requestShutdown('Stopping SpriteCraft app...'));
      }),
    );
  }

  bool webExited = false;
  final Future<int> webExit = webProcess.exitCode.then((int code) async {
    webExited = true;
    if (!shutdownCompleter.isCompleted) {
      final String message = code == 0
          ? 'studio exited cleanly. Stopping backend...'
          : 'studio exited with code $code. Stopping backend...';
      await requestShutdown(message);
    }
    return code;
  });

  try {
    await Future.any(<Future<void>>[
      _waitForHttpReady(webUri, timeout: const Duration(seconds: 45)),
      webExit.then((int code) {
        throw StateError(
          'studio exited with code $code before it became reachable at $webUri.',
        );
      }),
    ]);
    stdout.writeln('SpriteCraft web app running at $webUri');
    stdout.writeln('studio is wired to backend API ${backendUri.toString()}.');
    if (results.flag('open')) {
      await _openBrowser(webUri);
    }
  } on StateError catch (error) {
    await requestShutdown(error.message);
  }

  await shutdownCompleter.future;
  await _stopWebProcess(
    webProcess,
    alreadyExited: webExited,
    exitCode: webExit,
  );
  for (final StreamSubscription<ProcessSignal> subscription
      in signalSubscriptions) {
    await subscription.cancel();
  }
  await server.close(force: true);
}

Future<int> _runWebCommand(
  String executable,
  List<String> arguments, {
  required String workingDirectory,
  required Map<String, String> environment,
}) async {
  final Process process = await Process.start(
    executable,
    arguments,
    workingDirectory: workingDirectory,
    runInShell: true,
    environment: environment,
  );
  _pipePrefixedOutput(process.stdout, prefix: '[web]');
  _pipePrefixedOutput(process.stderr, prefix: '[web]');
  return process.exitCode;
}

Future<RuntimeConfig> _loadRuntimeConfig() {
  return RuntimeConfig.load().timeout(
    _studioStartupTimeout,
    onTimeout: () => throw StateError(
      'Backend startup timed out while loading configuration. Check your .env and project paths.',
    ),
  );
}

Future<StudioServer> _createStudioServer(RuntimeConfig config) {
  return StudioServer.create(config).timeout(
    _studioStartupTimeout,
    onTimeout: () => throw StateError(
      'Backend startup timed out while preparing LPC assets or database connections.',
    ),
  );
}

Future<HttpServer> _serveStudioServer(
  StudioServer studioServer, {
  required String host,
  required int port,
}) {
  return studioServer
      .serve(host: host, port: port)
      .timeout(
        _studioStartupTimeout,
        onTimeout: () => throw StateError(
          'Backend startup timed out while binding the local API server. Check whether the port is already in use.',
        ),
      );
}

void _pipePrefixedOutput(Stream<List<int>> stream, {required String prefix}) {
  stream.transform(utf8.decoder).transform(const LineSplitter()).listen((
    String line,
  ) {
    stdout.writeln('$prefix $line');
  });
}

Future<void> _waitForHttpReady(Uri uri, {required Duration timeout}) async {
  final HttpClient client = HttpClient();
  final Stopwatch stopwatch = Stopwatch()..start();
  try {
    while (stopwatch.elapsed < timeout) {
      try {
        final HttpClientRequest request = await client.getUrl(uri);
        final HttpClientResponse response = await request.close();
        try {
          await response.drain<void>();
        } on HttpException {
          // Dev servers can drop the connection mid-response while booting.
          // Treat that the same way as a refused connection and retry.
        }
        if (response.statusCode >= 200 && response.statusCode < 500) {
          return;
        }
      } catch (_) {
        // Keep polling until timeout.
      }

      await Future<void>.delayed(const Duration(milliseconds: 500));
    }

    throw StateError(
      'studio did not become reachable at $uri within ${timeout.inSeconds} seconds.',
    );
  } finally {
    client.close(force: true);
  }
}

Future<void> _stopWebProcess(
  Process process, {
  required bool alreadyExited,
  required Future<int> exitCode,
}) async {
  if (alreadyExited) {
    await exitCode;
    return;
  }

  if (Platform.isWindows) {
    try {
      await Process.run('taskkill', <String>[
        '/PID',
        '${process.pid}',
        '/T',
        '/F',
      ]);
    } on ProcessException {
      process.kill();
    }
  } else {
    process.kill(ProcessSignal.sigterm);
  }

  try {
    await exitCode.timeout(const Duration(seconds: 5));
  } on TimeoutException {
    process.kill(ProcessSignal.sigkill);
    await exitCode;
  }
}

int? _parseIntOption(ArgResults results, String name) {
  final String? value = results.option(name);
  if (value == null || value.isEmpty) {
    return null;
  }

  final int? parsed = int.tryParse(value);
  if (parsed == null) {
    throw ArgumentError('Expected an integer for --$name, got "$value".');
  }
  return parsed;
}

Future<void> _openBrowser(Uri uri) async {
  if (Platform.isWindows) {
    await Process.run('cmd', <String>['/c', 'start', uri.toString()]);
    return;
  }
  if (Platform.isMacOS) {
    await Process.run('open', <String>[uri.toString()]);
    return;
  }
  if (Platform.isLinux) {
    await Process.run('xdg-open', <String>[uri.toString()]);
  }
}
