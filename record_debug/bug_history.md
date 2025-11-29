# Bug History & Debugging Log

## 1. Model Server Crash (Deployment)
**Error**: `FailedPrecondition: 400 Model server exited unexpectedly.`
**Context**: Pipeline Run 1 & 2.
**Cause**: Used Scikit-learn serving container (`sklearn-cpu`) for an XGBoost model.
**Fix**:
- Switched serving container to `us-docker.pkg.dev/vertex-ai/prediction/xgboost-cpu.1-7:latest`.
- Pinned `xgboost==1.7.6` in training to match.

## 2. IAM Permissions Error (Pipeline)
**Error**: `Service account ... does not have [storage.objects.get] IAM permission`.
**Context**: Pipeline Run 2.
**Cause**: Default Compute Engine service account lacked access to the pipeline artifacts bucket.
**Fix**: Granted `roles/storage.admin` to the service account.

## 3. BigQuery Schema Mismatch (Training)
**Error**: `KeyError: "None of [Index(['category', ...])] are in the [columns]"`
**Context**: Pipeline Run 3 & Local Verification.
**Cause**: The BigQuery view `flashcard_training_view` was missing required feature columns.
**Fix**: Created and ran `scripts/create_training_view.sh` to define the correct view schema.

## 4. Local XGBoost Library Error (Local Dev)
**Error**: `XGBoost Library (libxgboost.dylib) could not be loaded`.
**Context**: Running `test_train_local.py` on macOS.
**Cause**: Missing OpenMP runtime (`libomp`).
**Fix**: Installed via `brew install libomp`.

## 5. API Validation Error (Frontend/Backend)
**Error**: `422 Unprocessable Content` on `/api/flashcards/review`.
**Context**: Reviewing flashcards in UI.
**Cause**: Frontend sent `quality` (values 0, 5) but backend expected `rating` (values 1-4).
**Fix**:
- Updated `FlashcardsPage.tsx` to send `rating` (1 for "Needs review", 4 for "I knew this").
- Updated `flashcards.ts` API service to match backend contract.

## 6. ML Prediction Input Format (Serving)
**Error**: `ValueError: Expecting 2 dimensional numpy.ndarray`.
**Context**: Calling `recommend-next` endpoint.
**Cause**: Backend sent a dictionary (JSON) to the XGBoost endpoint, which expects a flat list of feature values.
**Fix**: Updated `MLPredictionService.py` to convert features to a sorted list and manually encode categorical values.

## 7. Model Format Mismatch (Serving)
**Error**: `TypeError: Not supported type for data.<class 'xgboost.core.DMatrix'>`.
**Context**: Calling `recommend-next` endpoint after input fix.
**Cause**: Model was saved as `model.joblib` (Scikit-learn wrapper pickle) but the `xgboost-cpu` container expects a native `model.bst` file.
**Fix**: Updated `flashcard_schedule_pipeline.py` to use `model.save_model('model.bst')`.
