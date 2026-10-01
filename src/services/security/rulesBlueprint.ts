/**
 * @license
 * SENA Learning Hub - Blueprint de Reglas de Seguridad Firestore
 * Representación oficial de reglas RBAC que gobernarán la base de datos
 */

export const FIRESTORE_RULES_BLUEPRINT = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Funciones de ayuda reutilizables
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isInstructor() {
      return isAuthenticated() && getUserData().role == 'instructor';
    }
    
    function isApprentice() {
      return isAuthenticated() && getUserData().role == 'apprentice';
    }

    // Regla de Colección: /users
    match /users/{userId} {
      allow read: if isAuthenticated();
      // Solo el propio usuario puede actualizar su perfil básico (no su rol)
      allow write: if isAuthenticated() && request.auth.uid == userId 
                   && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'isActive']));
    }

    // Regla de Colección: /fichas
    match /fichas/{fichaId} {
      allow read: if isAuthenticated();
      allow write: if isInstructor();
    }

    // Regla de Colección: /courses
    match /courses/{courseId} {
      allow read: if isAuthenticated();
      allow write: if isInstructor();
    }

    // Regla de Colección: /activities
    match /activities/{activityId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isInstructor();
    }

    // Regla de Colección: /submissions (Evidencias de aprendices)
    match /submissions/{submissionId} {
      // Aprendiz solo lee sus propias evidencias; el instructor lee las de sus fichas
      allow read: if isAuthenticated() && (
        resource.data.apprenticeId == request.auth.uid || isInstructor()
      );
      // Aprendiz solo crea o edita sus propias evidencias en estado borrador/entrega
      allow create: if isApprentice() && request.resource.data.apprenticeId == request.auth.uid;
      allow update: if isApprentice() && resource.data.apprenticeId == request.auth.uid
                    && resource.data.status != 'graded'; // No puede editar si ya fue calificada
      allow delete: if false; // Evidencias académicas son inmutables para fines de auditoría SENA
    }

    // Regla de Colección: /grades (Calificaciones oficiales)
    match /grades/{gradeId} {
      // Aprendiz solo lee su propia calificación; instructor asignado puede calificar
      allow read: if isAuthenticated() && (
        resource.data.apprenticeId == request.auth.uid || isInstructor()
      );
      allow create, update: if isInstructor();
      allow delete: if false;
    }

    // Regla de Colección: /feedback (Retroalimentación)
    match /feedback/{feedbackId} {
      allow read: if isAuthenticated();
      allow write: if isInstructor();
    }

    // Regla de Colección: /notifications
    match /notifications/{notificationId} {
      allow read, update: if isAuthenticated() && resource.data.recipientUserId == request.auth.uid;
      allow create: if isAuthenticated();
    }

    // Regla de Colección: /gamification
    match /gamification/{apprenticeId} {
      allow read: if isAuthenticated();
      allow write: if isInstructor(); // El motor de gamificación o instructor actualiza puntos
    }
  }
}`;
