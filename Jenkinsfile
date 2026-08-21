pipeline {
    agent any
    
    environment {
        HARBOR_REGISTRY = 'harbor-dt'
        HARBOR_PROJECT  = 'devops-apps'
        HARBOR_CREDS    = credentials('harbor-cred')
        SONAR_HOST_URL  = 'http://sonar-dt:9000'
        SONAR_TOKEN     = credentials('sonarqube-token')
    }

    stages {
        stage('Checkout Source Code') {
            steps {
                checkout scm
            }
        }

        stage('SonarQube Code Analysis') {
            steps {
                script {
                    def scannerHome = tool 'sonar-scanner'
                    
                    withSonarQubeEnv('SonarQube') {
                        sh """
                            ${scannerHome}/bin/sonar-scanner \
                              -Dsonar.projectKey=absensi-sholat-rfid \
                              -Dsonar.sources=backend,frontend/src \
                              -Dsonar.host.url=${SONAR_HOST_URL} \
                              -Dsonar.login=${SONAR_TOKEN}
                        """
                    }
                }
            }
        }

        stage('Build & Push Backend Image') {
            steps {
                script {
                    dir('backend') {
                        def backendImage = docker.build("${HARBOR_REGISTRY}/${HARBOR_PROJECT}/backend:${BUILD_NUMBER}")
                        docker.withRegistry("https://${HARBOR_REGISTRY}", 'harbor-cred') {
                            backendImage.push("${BUILD_NUMBER}")
                            backendImage.push("latest")
                        }
                    }
                }
            }
        }

        stage('Build & Push Frontend Image') {
            steps {
                script {
                    dir('frontend') {
                        def frontendImage = docker.build("${HARBOR_REGISTRY}/${HARBOR_PROJECT}/frontend:${BUILD_NUMBER}")
                        docker.withRegistry("https://${HARBOR_REGISTRY}", 'harbor-cred') {
                            frontendImage.push("${BUILD_NUMBER}")
                            frontendImage.push("latest")
                        }
                    }
                }
            }
        }

        stage('Update GitOps Manifests') {
            steps {
                script {
                    sh """
                        sed -i 's|${HARBOR_REGISTRY}/${HARBOR_PROJECT}/backend:.*|${HARBOR_REGISTRY}/${HARBOR_PROJECT}/backend:${BUILD_NUMBER}|g' k8s/backend-deployment.yaml
                        sed -i 's|${HARBOR_REGISTRY}/${HARBOR_PROJECT}/frontend:.*|${HARBOR_REGISTRY}/${HARBOR_PROJECT}/frontend:${BUILD_NUMBER}|g' k8s/frontend-deployment.yaml
                    """
                    
                    withCredentials([usernamePassword(credentialsId: 'github-credentials-id', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                        sh """
                            git config user.name "Jenkins CI/CD"
                            git config user.email "ditasetyakurniawan@gmail.com"
                            git add k8s/*.yaml
                            
                            if ! git diff --cached --quiet; then
                                git commit -m "chore(gitops): update image tags to build #${BUILD_NUMBER} [skip ci]"
                                git push https://${GIT_USER}:${GIT_PASS}@github.com/ditasetyakurniawan-droid/absensi-v1.git HEAD:main
                            else
                                echo "ℹ️ Tidak ada perubahan tag pada manifest K8s. Skip commit."
                            fi
                        """
                    }
                }
            }
        }
    } // <-- Tanda kurung penutup 'stages' yang sebelumnya hilang

    post {
        always {
            script {
                cleanWs()
            }
        }
        success {
            echo "✅ Pipeline CI/CD Selesai! ArgoCD akan segera meng-sync perubahan ke Kubernetes Cluster."
        }
        failure {
            echo "❌ Pipeline CI/CD Gagal. Silakan periksa log Jenkins."
        }
    }
}