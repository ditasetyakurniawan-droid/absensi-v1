pipeline {
    agent any
    
    environment {
        HARBOR_REGISTRY = '192.168.100.58'
        HARBOR_PROJECT  = 'absensi'
        HARBOR_CREDS    = credentials('harbor-cred')
        SONAR_HOST_URL  = 'http://192.168.100.59:9000'
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
                    // Running SonarScanner for Go & React codebase
                    withSonarQubeEnv('SonarQubeServer') {
                        sh '''
                            sonar-scanner \
                              -Dsonar.projectKey=absensi-sholat-rfid \
                              -Dsonar.sources=backend,frontend/src \
                              -Dsonar.host.url=${SONAR_HOST_URL} \
                              -Dsonar.login=${SONAR_TOKEN}
                        '''
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
                    // Update tag image di k8s manifest sesuai BUILD_NUMBER
                    sh """
                        sed -i 's|${HARBOR_REGISTRY}/${HARBOR_PROJECT}/backend:.*|${HARBOR_REGISTRY}/${HARBOR_PROJECT}/backend:${BUILD_NUMBER}|g' k8s/backend-deployment.yaml
                        sed -i 's|${HARBOR_REGISTRY}/${HARBOR_PROJECT}/frontend:.*|${HARBOR_REGISTRY}/${HARBOR_PROJECT}/frontend:${BUILD_NUMBER}|g' k8s/frontend-deployment.yaml
                    """
                    
                    // Commit & push perubahan manifest agar ArgoCD otomatis sync
                    withCredentials([usernamePassword(credentialsId: 'github-access-token', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                        sh '''
                            git config user.name "Jenkins CI/CD"
                            git config user.email "jenkins@domainkamu.com"
                            git add k8s/*.yaml
                            git commit -m "chore(gitops): update image tags to build #${BUILD_NUMBER} [skip ci]" || true
                            git push https://${GIT_USER}:${GIT_PASS}@github.com/username/absensi-sholat-rfid.git HEAD:main
                        '''
                    }
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo "✅ Pipeline CI/CD Selesai! ArgoCD akan segera meng-sync perubahan ke Kubernetes Cluster."
        }
        failure {
            echo "❌ Pipeline CI/CD Gagal. Silakan periksa log Jenkins."
        }
    }
}