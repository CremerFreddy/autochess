using System.Collections;
using System.Collections.Generic;
using UnityEngine;

//spawnt die schachfelder und weißt ihnen die nötigen werte zu
public class schachbrett : MonoBehaviour
{
    public schachfeld [,] brettArray;
    public GameObject[,] units;
    public GameObject chessfieldPrefab;
    public Graph graphNode;
    public int size;
    // Start is called before the first frame update
    void Start()
    {
        brettArray = new schachfeld[size, size];
        units = new GameObject[size, size];
        for (int i = 0; i < size; i++)
        {
            for (int j = 0; j < size; j++)
            {
                GameObject feld = Instantiate(chessfieldPrefab, new Vector3(i * 10, 0, j * 10), Quaternion.identity);
                schachfeld feld1 = feld.GetComponent<schachfeld>();
                Node node1 = feld.GetComponent<Node>();
                node1.gameObject.transform.SetParent(graphNode.gameObject.transform);

        

                feld1.brett = this;
                brettArray[i, j] = feld1;
                feld1.x = i;
                feld1.y = j;

            }
        }

        for (int i = 0; i < size; i++)
        {
            for (int j = 0; j < size; j++)
            {
                Node node1 = brettArray[i, j].GetComponent<Node>();
                if (i > 0)
                {
                    node1.connections.Add(brettArray[i - 1, j].gameObject.GetComponent<Node>());
                    if (j > 0)
                    {
                        node1.connections.Add(brettArray[i - 1, j - 1].gameObject.GetComponent<Node>());
                    }
                    if (j < size -1)
                    {
                        node1.connections.Add(brettArray[i - 1, j + 1].gameObject.GetComponent<Node>());
                    }
                }
                if (j > 0)
                {
                    node1.connections.Add(brettArray[i, j - 1].gameObject.GetComponent<Node>());

                }

                if (i < size-1)
                {
                    node1.connections.Add(brettArray[i + 1, j].gameObject.GetComponent<Node>());
                    if (j < size-1)
                    {
                        node1.connections.Add(brettArray[i + 1, j + 1].gameObject.GetComponent<Node>());
                    }
                    if(j > 0)
                    {
                        node1.connections.Add(brettArray[i + 1, j - 1].gameObject.GetComponent<Node>());
                    }
                }
                if (j < size-1)
                {
                    node1.connections.Add(brettArray[i, j + 1].gameObject.GetComponent<Node>());

                }

            }
        }

        //add all chessfields to the graph
        graphNode.AddFields();
    }

    // Update is called once per frame
    void Update()
    {
        
    }   
}
