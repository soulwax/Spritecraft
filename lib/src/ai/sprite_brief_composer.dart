import '../models/lpc_models.dart';
import '../models/sprite_plan.dart';

class SpriteBriefPromptMemory {
  const SpriteBriefPromptMemory({
    required this.summary,
    required this.recentPrompts,
    required this.inferredTags,
  });

  final String summary;
  final List<String> recentPrompts;
  final List<String> inferredTags;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'summary': summary,
      'recentPrompts': recentPrompts,
      'inferredTags': inferredTags,
    };
  }
}

class SpriteBriefGuideStep {
  const SpriteBriefGuideStep({
    required this.slot,
    required this.label,
    required this.query,
    required this.rationale,
    required this.recommendations,
  });

  final String slot;
  final String label;
  final String query;
  final String rationale;
  final List<LpcItemDefinition> recommendations;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'slot': slot,
      'label': label,
      'query': query,
      'rationale': rationale,
      'recommendations': recommendations
          .map((LpcItemDefinition item) => item.toJson())
          .toList(),
    };
  }
}

class SpriteBriefCategorySuggestion {
  const SpriteBriefCategorySuggestion({
    required this.category,
    required this.label,
    required this.reason,
    required this.recommendations,
  });

  final String category;
  final String label;
  final String reason;
  final List<LpcItemDefinition> recommendations;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'category': category,
      'label': label,
      'reason': reason,
      'recommendations': recommendations
          .map((LpcItemDefinition item) => item.toJson())
          .toList(),
    };
  }
}

class SpriteBriefCandidateBuild {
  const SpriteBriefCandidateBuild({
    required this.label,
    required this.summary,
    required this.selections,
    required this.recommendations,
  });

  final String label;
  final String summary;
  final Map<String, String> selections;
  final List<LpcItemDefinition> recommendations;

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'label': label,
      'summary': summary,
      'selections': selections,
      'recommendations': recommendations
          .map((LpcItemDefinition item) => item.toJson())
          .toList(),
    };
  }
}

class SpriteBriefComposer {
  const SpriteBriefComposer({required this.catalog});

  final LpcCatalog catalog;

  SpritePlan normalizePlan({
    required SpritePlan? plan,
    required String prompt,
    required String bodyType,
    required String animation,
    SpriteBriefPromptMemory? promptMemory,
  }) {
    final SpritePlan basePlan =
        plan ??
        SpritePlan(
          concept: _deriveConcept(prompt),
          frameCount: _defaultFrameCount(animation),
          frameWidth: 64,
          frameHeight: 64,
          styleTags: <String>[
            'lpc-inspired',
            'pixel art',
            '$bodyType body',
            '$animation-ready',
          ],
          framePrompts: _fallbackFramePrompts(prompt, animation),
          buildPath: const <SpriteBuildPathStep>[],
        );

    final List<SpriteBuildPathStep> buildPath = basePlan.buildPath.isNotEmpty
        ? basePlan.buildPath
        : _fallbackBuildPath(
            prompt: prompt,
            bodyType: bodyType,
            animation: animation,
          );

    return SpritePlan(
      concept: basePlan.concept.trim().isEmpty
          ? _deriveConcept(prompt)
          : basePlan.concept,
      frameCount: basePlan.frameCount <= 0
          ? _defaultFrameCount(animation)
          : basePlan.frameCount,
      frameWidth: basePlan.frameWidth <= 0 ? 64 : basePlan.frameWidth,
      frameHeight: basePlan.frameHeight <= 0 ? 64 : basePlan.frameHeight,
      styleTags: _mergeStyleTags(
        baseTags: basePlan.styleTags.isEmpty
            ? <String>['lpc-inspired', 'pixel art', '$bodyType body']
            : basePlan.styleTags,
        promptMemory: promptMemory,
      ),
      framePrompts: basePlan.framePrompts.isEmpty
          ? _fallbackFramePrompts(prompt, animation)
          : basePlan.framePrompts,
      buildPath: buildPath,
    );
  }

  List<SpriteBriefGuideStep> buildGuideSteps({
    required SpritePlan plan,
    required String prompt,
    required String bodyType,
    required String animation,
    SpriteBriefPromptMemory? promptMemory,
  }) {
    return plan.buildPath.map((SpriteBuildPathStep step) {
      final String effectiveQuery = <String>[
        prompt,
        ...?promptMemory?.recentPrompts.take(2),
        step.query,
        ...?promptMemory?.inferredTags.take(3),
        ...plan.styleTags.take(3),
      ].where((String value) => value.trim().isNotEmpty).join(' ');

      final List<LpcItemDefinition> results = catalog.search(
        query: effectiveQuery,
        bodyType: bodyType,
        animation: animation,
        limit: 4,
      );

      return SpriteBriefGuideStep(
        slot: step.slot,
        label: step.label,
        query: step.query,
        rationale: step.rationale,
        recommendations: results,
      );
    }).toList();
  }

  SpriteBriefPromptMemory? buildPromptMemory({
    required String prompt,
    required List<String> promptHistory,
    required List<String> tags,
    required String notes,
  }) {
    final List<String> recentPrompts = <String>{
      for (final String entry in promptHistory)
        if (entry.trim().isNotEmpty && entry.trim() != prompt.trim())
          entry.trim(),
    }.take(4).toList(growable: false);
    final List<String> inferredTags = _inferPromptMemoryTags(
      prompt: prompt,
      promptHistory: recentPrompts,
      tags: tags,
      notes: notes,
    );

    if (recentPrompts.isEmpty && inferredTags.isEmpty && notes.trim().isEmpty) {
      return null;
    }

    return SpriteBriefPromptMemory(
      summary: _buildPromptMemorySummary(
        recentPrompts: recentPrompts,
        inferredTags: inferredTags,
        notes: notes,
      ),
      recentPrompts: recentPrompts,
      inferredTags: inferredTags,
    );
  }

  List<LpcItemDefinition> collectTopRecommendations(
    List<SpriteBriefGuideStep> steps, {
    int limit = 18,
  }) {
    final Map<String, LpcItemDefinition> deduped =
        <String, LpcItemDefinition>{};
    for (final SpriteBriefGuideStep step in steps) {
      for (final LpcItemDefinition item in step.recommendations) {
        deduped.putIfAbsent(item.id, () => item);
        if (deduped.length >= limit) {
          return deduped.values.toList(growable: false);
        }
      }
    }
    return deduped.values.toList(growable: false);
  }

  List<SpriteBriefCategorySuggestion> buildCategorySuggestions(
    List<SpriteBriefGuideStep> steps,
  ) {
    return steps
        .where((SpriteBriefGuideStep step) => step.recommendations.isNotEmpty)
        .map((SpriteBriefGuideStep step) {
          final String category = step.recommendations.first.category;
          return SpriteBriefCategorySuggestion(
            category: category,
            label: step.label,
            reason: step.rationale,
            recommendations: step.recommendations.take(3).toList(),
          );
        })
        .toList(growable: false);
  }

  SpriteBriefCandidateBuild buildCandidateBuild({
    required SpritePlan plan,
    required List<SpriteBriefGuideStep> steps,
  }) {
    final Map<String, LpcItemDefinition> byType = <String, LpcItemDefinition>{};
    for (final SpriteBriefGuideStep step in steps) {
      for (final LpcItemDefinition item in step.recommendations) {
        byType.putIfAbsent(item.typeName, () => item);
      }
    }

    final List<LpcItemDefinition> picks = byType.values.toList(growable: false);
    final Map<String, String> selections = <String, String>{
      for (final LpcItemDefinition item in picks)
        item.id: item.variants.isNotEmpty ? item.variants.first : 'default',
    };

    final String summary = picks.isEmpty
        ? 'No compatible layers were found yet for this brief.'
        : picks.take(4).map((LpcItemDefinition item) => item.name).join(', ');

    return SpriteBriefCandidateBuild(
      label: plan.concept,
      summary: summary,
      selections: selections,
      recommendations: picks,
    );
  }

  List<SpriteBuildPathStep> _fallbackBuildPath({
    required String prompt,
    required String bodyType,
    required String animation,
  }) {
    final String motif = prompt.trim();
    return <SpriteBuildPathStep>[
      SpriteBuildPathStep(
        slot: 'base',
        label: 'Lock the silhouette',
        query: '$motif body head base $bodyType',
        rationale:
            'Start with the body and face foundation so later outfit choices stay coherent.',
      ),
      SpriteBuildPathStep(
        slot: 'outfit',
        label: 'Choose the core outfit',
        query: '$motif torso legs clothing armor robe leather',
        rationale:
            'Set the main clothing or armor direction before layering props and accessories.',
      ),
      SpriteBuildPathStep(
        slot: 'head',
        label: 'Refine hair or headwear',
        query: '$motif hair hood helmet hat headwear',
        rationale:
            'Use head styling to reinforce role and mood without changing the base silhouette.',
      ),
      SpriteBuildPathStep(
        slot: 'gear',
        label: 'Add primary gear',
        query: '$motif weapon bow sword staff shield quiver tool',
        rationale:
            'Pick the item that communicates the character role most clearly in a single frame.',
      ),
      SpriteBuildPathStep(
        slot: 'accent',
        label: 'Finish with accents',
        query: '$motif accessory cape cloak belt bag trim $animation',
        rationale:
            'Use accessories and finishing touches to complete the read after the major choices are set.',
      ),
    ];
  }

  List<String> _fallbackFramePrompts(String prompt, String animation) {
    final String subject = prompt.trim().isEmpty
        ? 'modular fantasy character'
        : prompt.trim();
    return <String>[
      '$subject, $animation pose setup',
      '$subject, $animation anticipation',
      '$subject, $animation action frame',
      '$subject, $animation settle frame',
    ];
  }

  int _defaultFrameCount(String animation) {
    switch (animation.toLowerCase()) {
      case 'walk':
      case 'run':
        return 8;
      case 'attack':
      case 'slash':
      case 'thrust':
        return 6;
      default:
        return 4;
    }
  }

  String _deriveConcept(String prompt) {
    final String trimmed = prompt.trim();
    return trimmed.isEmpty ? 'Untitled SpriteCraft concept' : trimmed;
  }

  List<String> _mergeStyleTags({
    required List<String> baseTags,
    required SpriteBriefPromptMemory? promptMemory,
  }) {
    return <String>{
      for (final String entry in baseTags)
        if (entry.trim().isNotEmpty) entry.trim(),
      ...?promptMemory?.inferredTags,
    }.take(10).toList(growable: false);
  }

  List<String> _inferPromptMemoryTags({
    required String prompt,
    required List<String> promptHistory,
    required List<String> tags,
    required String notes,
  }) {
    final Map<String, int> keywordCounts = <String, int>{};

    for (final String tag in tags) {
      final String normalized = tag.trim().toLowerCase();
      if (normalized.isEmpty) {
        continue;
      }
      keywordCounts[normalized] = (keywordCounts[normalized] ?? 0) + 3;
    }

    for (final String text in <String>[prompt, ...promptHistory, notes]) {
      for (final String keyword in _extractKeywords(text)) {
        keywordCounts[keyword] = (keywordCounts[keyword] ?? 0) + 1;
      }
    }

    final List<MapEntry<String, int>> ranked = keywordCounts.entries.toList()
      ..sort((MapEntry<String, int> left, MapEntry<String, int> right) {
        final int byScore = right.value.compareTo(left.value);
        return byScore != 0 ? byScore : left.key.compareTo(right.key);
      });

    return ranked
        .where((MapEntry<String, int> entry) => entry.value >= 2)
        .map((MapEntry<String, int> entry) => entry.key)
        .take(6)
        .toList(growable: false);
  }

  Iterable<String> _extractKeywords(String text) sync* {
    const Set<String> stopWords = <String>{
      'with',
      'that',
      'this',
      'from',
      'into',
      'idle',
      'walk',
      'attack',
      'ready',
      'character',
      'sprite',
      'create',
      'look',
      'make',
      'have',
      'uses',
      'using',
      'keep',
      'very',
      'more',
      'less',
      'than',
      'then',
      'they',
      'their',
      'them',
      'neutral',
      'simple',
    };

    for (final RegExpMatch match in RegExp(r"[A-Za-z][A-Za-z'-]{2,}")
        .allMatches(text.toLowerCase())) {
      final String keyword = match.group(0) ?? '';
      if (keyword.isEmpty || stopWords.contains(keyword)) {
        continue;
      }
      yield keyword;
    }
  }

  String _buildPromptMemorySummary({
    required List<String> recentPrompts,
    required List<String> inferredTags,
    required String notes,
  }) {
    final List<String> parts = <String>[];
    if (recentPrompts.isNotEmpty) {
      parts.add(
        'Keeping this build aligned with ${recentPrompts.length} saved prompt${recentPrompts.length == 1 ? '' : 's'}',
      );
    }
    if (inferredTags.isNotEmpty) {
      parts.add('reusing style cues like ${inferredTags.take(3).join(', ')}');
    }
    if (notes.trim().isNotEmpty) {
      parts.add('respecting saved workspace notes');
    }

    return parts.isEmpty
        ? 'No saved prompt memory is influencing this brief yet.'
        : '${parts.join(' and ')}.';
  }
}
