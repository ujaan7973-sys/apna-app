package expo.modules.cliporavideorenderer

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.net.Uri
import androidx.media3.common.Effect
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.Brightness
import androidx.media3.effect.CanvasOverlay
import androidx.media3.effect.Contrast
import androidx.media3.effect.Presentation
import androidx.media3.effect.RgbFilter
import androidx.media3.effect.OverlayEffect
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.EditedMediaItemSequence
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.io.File

@OptIn(UnstableApi::class)
class CliporaVideoRendererModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CliporaVideoRenderer")

    AsyncFunction("exportVideo") { inputUri: String, outputPath: String, width: Int, height: Int, filterName: String, ratio: String, brightnessValue: Double, contrastValue: Double, caption: String, captionColor: String, captionSize: Int, captionPosition: String, musicUri: String, trimStartMs: Long, trimEndMs: Long, promise: Promise ->
      try {
        val context = appContext.reactContext ?: throw IllegalStateException("Android context unavailable")
        val outputFile = File(outputPath)
        outputFile.parentFile?.mkdirs()
        if (outputFile.exists()) outputFile.delete()

        val baseItem = MediaItem.Builder().setUri(Uri.parse(inputUri))
        if (trimStartMs > 0L || trimEndMs > trimStartMs) {
          val clipping = MediaItem.ClippingConfiguration.Builder()
            .setStartPositionMs(trimStartMs.coerceAtLeast(0L))
          if (trimEndMs > trimStartMs) clipping.setEndPositionMs(trimEndMs)
          baseItem.setClippingConfiguration(clipping.build())
        }
        val layout = if (ratio == "Original") Presentation.LAYOUT_SCALE_TO_FIT else Presentation.LAYOUT_SCALE_TO_FIT_WITH_CROP
        val presentation = Presentation.createForWidthAndHeight(
          width.coerceAtLeast(2), height.coerceAtLeast(2), layout
        )
        val videoEffects = mutableListOf<Effect>()
        if (filterName == "Mono" || filterName == "Noir") videoEffects.add(RgbFilter.createGrayscaleFilter())
        if (brightnessValue != 0.0) videoEffects.add(Brightness(brightnessValue.toFloat().coerceIn(-1f, 1f)))
        if (contrastValue != 0.0) videoEffects.add(Contrast(contrastValue.toFloat().coerceIn(-1f, 1f)))
        videoEffects.add(presentation)
        if (caption.isNotBlank()) {
          val textOverlay = object : CanvasOverlay(true) {
            override fun onDraw(canvas: Canvas, presentationTimeUs: Long) {
              val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = try { Color.parseColor(captionColor) } catch (_: IllegalArgumentException) { Color.WHITE }
                textSize = (captionSize.coerceIn(12, 72) * canvas.width / 390f).coerceIn(18f, 120f)
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                textAlign = Paint.Align.CENTER
                setShadowLayer(5f, 1f, 2f, Color.BLACK)
              }
              val words = caption.trim().split(Regex("\\s+"))
              val maxWidth = canvas.width * 0.9f
              val lines = mutableListOf<String>()
              var line = ""
              for (word in words) {
                val candidate = if (line.isEmpty()) word else "$line $word"
                if (paint.measureText(candidate) > maxWidth && line.isNotEmpty()) {
                  lines.add(line)
                  line = word
                } else line = candidate
              }
              if (line.isNotEmpty()) lines.add(line)
              val lineHeight = paint.textSize * 1.2f
              val startY = when (captionPosition) {
                "Top" -> paint.textSize + 24f
                "Center" -> (canvas.height - (lines.size - 1) * lineHeight) / 2f
                else -> canvas.height - 24f - (lines.size - 1) * lineHeight
              }
              lines.forEachIndexed { index, value ->
                canvas.drawText(value, canvas.width / 2f, startY + index * lineHeight, paint)
              }
            }
          }
          videoEffects.add(OverlayEffect(listOf(textOverlay)))
        }
        val videoItem = EditedMediaItem.Builder(baseItem.build())
          .setEffects(Effects(emptyList(), videoEffects))
          .build()

        val transformer = Transformer.Builder(context)
          .setVideoMimeType(MimeTypes.VIDEO_H264)
          .setAudioMimeType(MimeTypes.AUDIO_AAC)
          .addListener(object : Transformer.Listener {
            override fun onCompleted(composition: Composition, exportResult: ExportResult) {
              promise.resolve(Uri.fromFile(outputFile).toString())
            }
            override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {
              promise.reject("CLIPORA_EXPORT_FAILED", exportException.message ?: "Media3 export failed", exportException)
            }
          })
          .build()

        if (musicUri.isNotBlank()) {
          val videoSequence = EditedMediaItemSequence.withAudioAndVideoFrom(listOf(videoItem))
          val musicItem = EditedMediaItem.Builder(MediaItem.fromUri(Uri.parse(musicUri))).build()
          val musicSequence = EditedMediaItemSequence.withAudioFrom(listOf(musicItem))
            .buildUpon()
            .setIsLooping(true)
            .build()
          val composition = Composition.Builder(videoSequence, musicSequence).build()
          transformer.start(composition, outputFile.absolutePath)
        } else {
          transformer.start(videoItem, outputFile.absolutePath)
        }
      } catch (error: Throwable) {
        promise.reject("CLIPORA_EXPORT_SETUP_FAILED", error.message ?: "Could not start video export", error)
      }
    }
  }
}